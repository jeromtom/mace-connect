// Importing the Cheerio library (JavaScript equivalent of BeautifulSoup)
import * as cheerio from 'cheerio';

// API endpoint for faculty data
const API_URL = 'https://mace.etlab.in/website/json/getdeptdetails';

// Department configurations
const DEPARTMENTS = {
  ca: { id: 1, prefix: 'faculty-ca' },         // Computer Applications
  civil: { id: 2, prefix: 'faculty-civil' },
  mechanical: { id: 3, prefix: 'faculty-mech' },
  eee: { id: 4, prefix: 'faculty-eee' },
  ece: { id: 5, prefix: 'faculty-ece' },
  cse: { id: 6, prefix: 'faculty-cse' },
  mathematics: { id: 7, prefix: 'faculty-maths' },
  science: { id: 8, prefix: 'faculty-science' }  // Science & Humanities
};

export default {
  async fetch(request, env, ctx) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      // Get department from URL parameter
      const url = new URL(request.url);
      const dept = url.searchParams.get('dept');
      const useBackup = url.searchParams.get('useBackup') === 'true';

      let facultyData;
      
      if (dept && DEPARTMENTS[dept]) {
        // Fetch single department
        console.log(`Fetching single department: ${dept}`);
        try {
          if (!useBackup) {
            // Try primary API first
            facultyData = { [dept]: await scrapeDepartmentData(dept, DEPARTMENTS[dept], env) };
            // Update backup after successful fetch
            await env.FACULTY_BACKUP.put(dept, JSON.stringify(facultyData[dept]));
          } else {
            throw new Error('Using backup as requested');
          }
        } catch (error) {
          console.log('Primary API failed, trying backup:', error);
          // Try to get from backup
          const backupData = await env.FACULTY_BACKUP.get(dept);
          if (backupData) {
            facultyData = { [dept]: JSON.parse(backupData) };
            console.log('Using backup data for', dept);
          } else {
            throw new Error(`No backup data available for ${dept}`);
          }
        }
      } else {
        // Fetch all departments
        try {
          if (!useBackup) {
            facultyData = await scrapeAllDepartments(env);
            // Update backup for all departments
            for (const [deptName, deptData] of Object.entries(facultyData)) {
              await env.FACULTY_BACKUP.put(deptName, JSON.stringify(deptData));
            }
          } else {
            throw new Error('Using backup as requested');
          }
        } catch (error) {
          console.log('Primary API failed, trying backup for all departments:', error);
          facultyData = {};
          // Try to get all departments from backup
          for (const deptName of Object.keys(DEPARTMENTS)) {
            const backupData = await env.FACULTY_BACKUP.get(deptName);
            if (backupData) {
              facultyData[deptName] = JSON.parse(backupData);
            }
          }
          if (Object.keys(facultyData).length === 0) {
            throw new Error('No backup data available');
          }
        }
      }

      return new Response(JSON.stringify(facultyData), { headers });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        details: error.cause || 'No additional details'
      }), {
        headers,
        status: 500,
      });
    }
  },
};

async function scrapeAllDepartments(env) {
  const allDepartments = {};

  for (const [deptName, deptConfig] of Object.entries(DEPARTMENTS)) {
    try {
      console.log(`Fetching ${deptName} department data...`);
      const deptData = await scrapeDepartmentData(deptName, deptConfig, env);
      allDepartments[deptName] = deptData;
    } catch (error) {
      console.error(`Error fetching ${deptName} department:`, error);
      allDepartments[deptName] = { error: error.message };
    }
  }

  return allDepartments;
}

// Add utility function to fetch and convert image to base64
async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

// Utility function to store image in R2
async function storeImageInR2(imageUrl, key, env) {
  try {
    // Fetch original image
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();

    // Store in R2 without compression
    await env.FACULTY_IMAGES.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: response.headers.get('content-type') || 'image/jpeg',
        cacheControl: 'public, max-age=31536000' // Cache for 1 year
      }
    });

    return true;
  } catch (error) {
    console.error('Error processing image:', error);
    return false;
  }
}

// Utility function to store image in Cloudflare Images
async function storeImageInCloudflareImages(imageUrl, key, env) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    
    const formData = new FormData();
    formData.append('file', new Blob([await response.arrayBuffer()]));
    formData.append('metadata', JSON.stringify({ key }));

    const uploadResponse = await fetch('https://api.cloudflare.com/client/v4/accounts/{account_id}/images/v1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to Cloudflare Images: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();
    return result.result.variants[0]; // URL of optimized image
  } catch (error) {
    console.error('Error uploading to Cloudflare Images:', error);
    return null;
  }
}

// Modify processHodData to use R2
async function processHodData(hodData, prefix, env) {
  if (!hodData) return null;

  const photoUrl = hodData.photo ? `http://mace.etlab.in/uploads/images/staff/${hodData.photo}` : '';
  let r2ImageUrl = null;

  if (photoUrl) {
    const imageKey = `${prefix}/${hodData.id}/${hodData.photo}`;
    
    // Check if image exists in R2
    let imageObj = await env.FACULTY_IMAGES.get(imageKey);
    
    if (!imageObj) {
      // If not in R2, fetch, compress and store
      const stored = await storeImageInR2(photoUrl, imageKey, env);
      if (stored) {
        imageObj = await env.FACULTY_IMAGES.get(imageKey);
      }
    }

    if (imageObj) {
      r2ImageUrl = imageObj.url; // R2 public URL
    }
  }

  return {
    name: hodData.name || '',
    designation: hodData.designation || '',
    qualification: hodData.education || '',
    interests: hodData.interests || '',
    phone: hodData.phone || '',
    email: hodData.email || '',
    photo: photoUrl,
    photoBackup: r2ImageUrl, // R2 URL instead of base64
    profile: hodData.slug ? `${prefix}/${hodData.id}/${hodData.slug}` : ''
  };
}

// Modify processFacultyData to use R2
async function processFacultyData(facultyList, prefix, env) {
  if (!Array.isArray(facultyList)) return [];

  const processedFaculty = [];
  
  for (const faculty of facultyList) {
    const photoUrl = faculty.photo ? `http://mace.etlab.in/uploads/images/staff/${faculty.photo}` : '';
    let r2ImageUrl = null;

    if (photoUrl) {
      const imageKey = `${prefix}/${faculty.id}/${faculty.photo}`;
      
      // Check if image exists in R2
      let imageObj = await env.FACULTY_IMAGES.get(imageKey);
      
      if (!imageObj) {
        // If not in R2, fetch, compress and store
        const stored = await storeImageInR2(photoUrl, imageKey, env);
        if (stored) {
          imageObj = await env.FACULTY_IMAGES.get(imageKey);
        }
      }

      if (imageObj) {
        r2ImageUrl = imageObj.url; // R2 public URL
      }
    }

    processedFaculty.push({
      name: faculty.name || '',
      designation: faculty.designation || '',
      qualification: faculty.education || '',
      interests: faculty.interests || '',
      phone: faculty.phone || '',
      email: faculty.email || '',
      photo: photoUrl,
      photoBackup: r2ImageUrl, // R2 URL instead of base64
      profile: faculty.slug ? `${prefix}/${faculty.id}/${faculty.slug}` : ''
    });
  }

  return processedFaculty;
}

// Update scrapeDepartmentData to pass env to processing functions
async function scrapeDepartmentData(deptName, deptConfig, env) {
  try {
    const response = await fetch(`${API_URL}?id=${deptConfig.id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://www.mace.ac.in',
        'Referer': 'https://www.mace.ac.in/'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`${deptName} API response:`, data);

    return {
      hod: await processHodData(data[0], deptConfig.prefix, env),
      faculty: await processFacultyData(data[1], deptConfig.prefix, env)
    };

  } catch (error) {
    console.error(`Error fetching ${deptName} data:`, error);
    throw error;
  }
} 