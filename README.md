# MACE Faculty API

A Cloudflare Workers API service that fetches faculty information from Mar Athanasius College of Engineering's etlab portal. The API includes data backup and image optimization features.

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

### Get All Faculty
http
GET /api/faculty

Returns a list of all faculty members across all departments.

### Get Faculty by Department
```http
GET /api/faculty/:departmentId
```
Returns faculty members from a specific department using the department ID.

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

The API uses standard HTTP status codes and returns error messages in the following format:

```json
{
  "success": false,
  "error": {
    "message": string,
    "code": string
  }
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

## License

MIT License - see [LICENSE](LICENSE) for details

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.