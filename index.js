const functions = require('@google-cloud/functions-framework');
const { initializeApp } = require('firebase-admin/app');
const app = initializeApp();

const { VertexAI } = require('@google-cloud/vertexai');
const { getAuth } = require('firebase-admin/auth');

const project = 'expense-tracker-455519';
const location = 'us-central1';

const vertexAI = new VertexAI({ project: project, location: location });

const instructions = `You are an AI assistant that helps user extract information from receipts.
You will be provided with a link to a photo of a receipt.
Your task is to extract the following information from the receipt:
1. The total amount spent.
2. The date of the transaction.
3. The description of the transaction based on the data on the receipt, not longer than 50 words.
Output format:
{"totalAmount":22.25,"date":"2025-04-26T12:34:56.789Z", "description":"I spent 22.25 in Aldi. I bought..."}`;

const generativeModel = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { maxOutputTokens: 256 },
    systemInstruction: {
        role: 'system',
        parts: [{ "text": instructions }]
    },
});
/**
 * HTTP Cloud Function: geminiRecieptReader
 *
 * Uses the Vertex AI Generative Model (Gemini 2.0 Flash) to extract structured information from a receipt image.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} req.body - JSON body containing `gsutilURI`.
 * @param {string} req.body.gsutilURI - URI of the image in Google Cloud Storage (e.g., "gs://bucket/path.jpg").
 * @param {Object} res - HTTP response object.
 * @returns {Object} JSON object with the extracted receipt data:
 * {
 *   "totalAmount": number,
 *   "date": ISODateString,
 *   "description": string
 * }
 *
 * @throws 400 - If the request body is missing or invalid.
 * @throws 405 - If the request method is not POST.
 * @throws 500 - If there is an error calling the model or parsing the response.
 */

functions.http('geminiReceiptReader', async (req, res) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    console.log("ID Token:", idToken);
    getAuth()
        .verifyIdToken(idToken)
        .then(async (decodedToken) => {
            const uid = decodedToken.uid;
            if (!req.body || !req.body.gsutilURI) {
                return res.status(400).send('Missing image URI');
            }
            if (req.method == 'POST') {
                const filePart = { fileData: { fileUri: req.body.gsutilURI, mimeType: "image/jpeg" } };
                const textPart = { text: 'You should extract the data from this image, as defined in the system requirements.' };
                const request = {
                    contents: [{ role: 'user', parts: [textPart, filePart] }],
                };
                try {
                    const result = await generativeModel.generateContent(request);
                    const rawText = result.response.candidates[0].content.parts[0].text
                    const cleanJson = rawText.replace(/```json|```/g, '').trim();
                    const parsed = JSON.parse(cleanJson);

                    res.status(200).send(parsed);
                } catch (error) {
                    res.status(500).send('Error: ' + error.message);
                }
            }
            else {
                res.status(405).send('Method Not Allowed');
            }

        })
        .catch((error) => {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Token is invalid or expired.',
            });
        });

});