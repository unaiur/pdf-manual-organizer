import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL || undefined,
});

export async function extractManualMetadata(text: string): Promise<{
  brand: string;
  model: string;
  device: string;
  manualType: string;
}> {
  const prompt = `You are an expert at extracting structured metadata from home appliance manuals. Given the following manual text, extract:
- brand (e.g., Siemens, Samsung, LG)
- model (e.g., EQ700, TQ700, XR-1234)
- device (e.g., coffee maker, fridge, TV, washing machine)
- manualType (e.g., user manual, installation guide, warranty, quick start guide)

If a field is not found, return an empty string for that field.

Return ONLY a minified JSON object with these exact keys: brand, model, device, manualType. Do not include any explanation or extra text.

Example output:
{"brand":"Siemens","model":"EQ700","device":"integral coffeemaker","manualType":"user manual"}

Manual text:
"""
${text.slice(0, 4000)}
"""`;

  console.log("[LLM] Sending prompt to OpenAI:\n", prompt);
  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts structured metadata from device manuals.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 256
    });
  } catch (err) {
    console.error("[LLM] Error sending request to OpenAI:", err);
    return { brand: '', model: '', device: '', manualType: '' };
  }
  const content = completion.choices[0].message.content;
  console.log("[LLM] OpenAI response:", content);
  try {
    const json = JSON.parse(content || '{}');
    return {
      brand: json.brand || '',
      model: json.model || '',
      device: json.device || '',
      manualType: json.manualType || ''
    };
  } catch (e) {
    console.error("[LLM] Failed to parse OpenAI response as JSON:", content);
    return { brand: '', model: '', device: '', manualType: '' };
  }
}
