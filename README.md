# MACE Faculty API

A Cloudflare Workers API service that fetches faculty information from Mar Athanasius College of Engineering's etlab portal. The API includes data backup and image optimization features.

## Video Overview

[![Watch the video](https://www.loom.com/embed/73b888b48a1342c086948647da2e2351?sid=b8910e3b-c253-4e94-82ce-b69e81e53005)](https://www.loom.com/share/73b888b48a1342c086948647da2e2351?sid=f9e3d43e-ab31-4128-94e2-3567785b7681)

Click the image above to watch the video overview of the project.

## Features

- 📚 Faculty data from all departments:
  - Computer Applications (id: 1)
  - Civil Engineering (id: 2)
  - Mechanical Engineering (id: 3)
  - Electrical & Electronics Engineering (id: 4)
  - Electronics & Communication Engineering (id: 5)
  - Computer Science Engineering (id: 6)
  - Mathematics (id: 7)
  - Science & Humanities (id: 8)

- 🖼️ Image handling:
  - Automatic image backup to Cloudflare R2
  - Image optimization via Cloudflare Images
  - Fallback URLs for images

- 💾 Data backup:
  - Primary data from etlab API
  - Backup data in Cloudflare KV storage
  - Automatic backup on successful fetches

## API Endpoints

### Get Faculty Data by Department

GET /api/faculty?dept=:departmentId

Retrieves faculty information for a specific department.

#### Parameters

| Parameter    | Type   | Description                    |
|--------------|--------|--------------------------------|
| departmentId | string | Department key (e.g., `ca`, `civil`, `mechanical`) |

#### Example Request

curl https://your-worker.your-subdomain.workers.dev/api/faculty?dept=mechanical

## Get All Faculty
http
GET /api/faculty

Returns a list of all faculty members across all departments.

### Get Single Faculty
```http
GET /api/faculty/member/:facultyId
```
Returns detailed information about a specific faculty member.

## Response Format

```json
{
  "success": boolean,
  "data": {
    "id": string,
    "name": string,
    "designation": string,
    "department": string,
    "departmentId": number,
    "imageUrl": string,
    "imageBackupUrl": string
  }[]
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Successful request
- `400`: Invalid request parameters
- `404`: Department not found
- `500`: Server error

Example error response:

```json
{
  "success": false,
  "error": "Department not found"
}
```

## Rate Limiting

- 100 requests per minute per IP address
- Status code 429 returned when rate limit is exceeded

## Development

### Prerequisites

- Node.js 16.x or higher
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers and R2 enabled

### Environment Variables

Create a `.dev.vars` file with the following variables:

```env
ETLAB_API_KEY=your_etlab_api_key
R2_BUCKET_NAME=your_r2_bucket_name
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_IMAGES_TOKEN=your_cloudflare_images_token
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Deploy to Cloudflare Workers
npm run deploy
```

## Deployment

### Prerequisites

1. [Node.js](https://nodejs.org/) (v14 or higher)
2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. Cloudflare account with Workers, KV, and R2 access

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd mace-faculty-api
```

2. Install dependencies:

```bash
npm install
```

3. Configure Cloudflare resources:

   a. Create KV namespace:
   ```bash
   wrangler kv:namespace create "FACULTY_BACKUP"
   ```

   b. Create R2 bucket:
   ```bash
   wrangler r2 bucket create faculty-images
   ```

4. Update `wrangler.toml` with your account details and binding information.

5. Deploy to Cloudflare Workers:

```bash
wrangler deploy
```

## Local Development

Run the development server:

```bash
wrangler dev
```

The API will be available at `http://localhost:8787`

Make sure to replace your-worker.your-subdomain.workers.dev with your actual Cloudflare Workers URL for live deployment.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Acknowledgments

- Mar Athanasius College of Engineering for the faculty data
- Cloudflare for the Workers, KV, and R2 infrastructure

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.