# Gemini Receipt Reader Cloud Function

A Google Cloud Function that uses Vertex AI's Gemini 2.0 Flash model to extract structured data from receipt images.

## Functionality

This function:
1. Authenticates users via Firebase Auth
2. Processes receipt images stored in Google Cloud Storage
3. Extracts key information using AI:
   - Total amount spent
   - Transaction date
   - Brief description (under 50 words)

