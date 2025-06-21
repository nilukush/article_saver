import jwt from 'jsonwebtoken'

// Get token from command line argument
const token = process.argv[2]

if (!token) {
    console.error('Please provide a JWT token as an argument')
    process.exit(1)
}

try {
    // Decode without verifying (since we just want to see the payload)
    const decoded = jwt.decode(token)
    console.log('\nDecoded JWT payload:')
    console.log(JSON.stringify(decoded, null, 2))
} catch (error) {
    console.error('Error decoding token:', error)
}