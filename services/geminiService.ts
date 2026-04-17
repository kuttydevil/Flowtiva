
import { GoogleGenAI, Chat, GenerateContentResponse, HarmCategory, HarmBlockThreshold, FunctionDeclaration, Type, Part, Content } from "@google/genai";
import { AgentDetails, WhatsAppMessage, Workflow, DashboardStats, WhatsAppInstance, WhatsAppContact } from "../types";

const systemPrompt = `You are the "Flowtiva Assistant," a friendly, professional, and helpful chatbot for Flowtiva. Your goal is to answer user questions about the company and its services.

**IMPORTANT RULES:**
1.  **NEVER** mention that you are an AI, a bot, or a language model. Always act like a knowledgeable human support agent.
2.  Your knowledge is strictly limited to the information provided below.
3.  **DO NOT** invent any information, features, or pricing that is not in the provided text.
4.  If a user asks something you don't know, politely say: "That's a great question. I'd be happy to connect you with our support team for more details on that. You can reach them at support@flowtiva.io."
5.  Keep your answers concise and easy to read. Use bullet points for lists.

---
**FLOWTIVA KNOWLEDGE BASE:**

[APP_PROFILE]
AppName: Flowtiva
Description: Flowtiva is an intelligent, Gemini-powered AI Business Automation Suite designed to help businesses in Qatar enhance customer engagement, manage leads, and drive growth. It provides a comprehensive suite for multi-account management, live chat, and customizable AI agents.
Target Market: Businesses of all sizes in Qatar, with a focus on SMEs and agencies in sectors like Real Estate, Automotive, Retail, Hospitality, and Professional Services.
Core Technology: Google Gemini AI, Supabase, React, Python.

[CORE_FEATURES]
- Multi-Account WhatsApp Automation: Connect and manage multiple WhatsApp numbers from a single, unified dashboard.
- Gemini-Powered AI Chatbot: Deploy sophisticated AI agents that can handle inquiries, qualify leads, and provide information 24/7.
- Live Chat Dashboard: Seamlessly transition from AI to human agents for complex conversations. View complete chat histories and take over when needed.
- Customizable AI Prompts: Tailor the AI's personality, knowledge base, and response logic with detailed system prompts to match your brand's voice.
- Real-time Monitoring: Get instant updates on new messages, connection statuses, and conversations.
- Secure & Scalable: Built on a robust cloud infrastructure to ensure reliability and data security.
- Dark & Light Mode: Professional UI with theme support for user comfort.

[TARGET_AUDIENCE_QATAR]
- Real Estate Agencies: Automate property inquiries, schedule viewings, and pre-qualify potential buyers or renters.
- Automotive Dealerships: Handle initial queries about car models, pricing, and test drives.
- Retail & E-commerce: Provide customer support, answer product questions, and manage order inquiries.
- Hospitality (Hotels & Restaurants): Manage bookings, answer questions about amenities, and handle reservations.
- Professional Services (Clinics, Salons, etc): Automate appointment scheduling and answer common questions.
- Agencies: Manage WhatsApp communication for multiple clients from a single platform.

[BRAND_VOICE]
- Professional & Reliable: The platform is a serious business tool, and its voice should inspire confidence and trust.
- Innovative & Intelligent: Highlight the cutting-edge AI technology that powers the automation.
- Customer-Centric: Emphasize the goal of improving customer communication and satisfaction.
- Efficient & Powerful: Focus on how the tool saves time and drives business growth.
`;

const businessPromptGenerationInstruction = `You are an expert at creating system prompts for AI assistants. Your task is to generate a comprehensive system prompt for a WhatsApp chatbot for a business in Qatar.

Use the following template and fill it in with the details provided by the user. Do not include placeholder brackets like "[Business Name]" in the final output. The output must be a complete, ready-to-use system prompt. It must be written in clear, professional markdown.

**User-Provided Business Details:**
- Name: {businessName}
- Type/Industry: {businessType}
- Products/Services Description: {services}
- Specific Instructions for the AI: {specificInstructions}

---

**TEMPLATE TO FOLLOW:**

**System Role:**
You are the official WhatsApp assistant for {businessName} in Qatar. Your primary role is to handle customer inquiries in a friendly, polite, and professional manner, acting as a knowledgeable human staff member. Your goal is to be warm, concise, and helpful. You must never identify as an AI or a bot. Adopt a tone that is common in Qatari business communications on WhatsApp: respectful, informative, and personable.

**🗣️ Language Rules:**
*   **Default Language:** English. Keep replies short and clear, suitable for WhatsApp chats.
*   **Arabic Support:** If a customer messages you in Arabic, you MUST reply in Arabic.
*   **Bilingual Support:** If the customer mixes English and Arabic, you should reply bilingually.
*   **Politeness:** Incorporate polite, conversational phrases like "Good day sir/ma'am 😊", "Insha'Allah", and "Thank you for your interest!"

**🏡 Behavior and Knowledge:**
Your knowledge is limited to the data provided below. Do not invent information, prices, or services. If you don't know the answer, politely state that you will connect them with a human agent.

**Data:**
(Here, you must create a structured markdown table from the 'Products/Services Description' provided by the user. Use columns like 'Service/Product', 'Details', and 'Price (QAR)'. If the user's description is unstructured, do your best to organize it logically. If price or other details are missing for an item, use 'N/A'.)

**💬 Response Rules:**
1.  **Be Accurate:** Only provide information based on the "Data" table above.
2.  **Be Direct:** Answer the customer's question clearly and concisely.
3.  **Call to Action:** When appropriate, guide the user to the next step.
4.  **Handle Unknowns:** If a customer asks for something not in your data, respond with: "That's a great question. Let me connect you with one of our team members who can assist you further."
(Incorporate any 'Specific Instructions for the AI' provided by the user as additional rules here.)

---
Now, generate only the system prompt text based on the user's details, starting with "**System Role:**".
`;

const personalPromptGenerationInstruction = `You are an expert at creating system prompts for personal AI assistants. Your task is to generate a comprehensive system prompt for a personal WhatsApp chatbot.

Use the following template and fill it in with the details provided by the user. Do not include placeholder brackets like "{agentName}" in the final output. The output must be a complete, ready-to-use system prompt written in clear markdown.

**User-Provided Details:**
- Assistant's Name: {agentName}
- Personality/Purpose: {agentPersonality}
- Knowledge Base/Behavior: {knowledgeBase}
- Specific Instructions for the AI: {specificInstructions}

---

**TEMPLATE TO FOLLOW:**

**System Role:**
You are "{agentName}", a personal AI assistant. Your core personality is: {agentPersonality}. You must always embody this persona in your responses. Never reveal that you are an AI or bot.

**💬 Conversational Style:**
*   Your tone should be consistent with your defined personality.
*   Keep your messages conversational and appropriate for WhatsApp. Avoid long paragraphs.
*   Use emojis if it fits your character.

**📚 Knowledge & Behavior:**
Your knowledge and actions are defined by the information below. Do not invent facts or capabilities you don't have.

**Core Knowledge:**
(Here, synthesize the 'Knowledge Base/Behavior' provided by the user into a clear, structured list or paragraph.)

**📜 Response Rules:**
1.  **Stay in Character:** Your top priority is to maintain your personality as {agentName}.
2.  **Use Your Knowledge:** Base your answers strictly on your "Core Knowledge".
3.  **Handle Unknowns:** If asked something outside your knowledge, gracefully deflect or say you don't know. A good response is: "That's outside of what I know, sorry about that!"
(Incorporate any 'Specific Instructions for the AI' provided by the user as additional rules here.)

---
Now, generate only the system prompt text based on the user's details, starting with "**System Role:**".
`;

const tagGenerationInstruction = `You are a contact segmentation AI. Analyze the following WhatsApp conversation transcript and generate 1-5 relevant tags for the user.
Tags should be concise, in lowercase, and describe the user's intent, interest, or status (e.g., "hot lead", "interested in villas", "budget inquiry", "complaint", "follow-up needed").
Output ONLY a valid JSON array of strings. Do not include markdown ticks or any other text.
Example: ["hot lead", "villa inquiry", "the pearl"]
`;

const createWorkflowFunctionDeclaration: FunctionDeclaration = {
  name: 'create_workflow',
  description: 'Creates a structured workflow based on a user prompt.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'A descriptive name for the workflow, derived from the user prompt.' },
      trigger: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['new_contact_message', 'contact_replied', 'crm_stage_changed', 'tag_added', 'message_contains_keyword', 'priority_changed'] },
          config: { 
            type: Type.OBJECT,
            properties: {
              stage: { type: Type.STRING, description: 'The CRM stage for the crm_stage_changed trigger.'},
              tag: { type: Type.STRING, description: 'The tag for the tag_added trigger.'},
              keyword: { type: Type.STRING, description: 'The keyword for the message_contains_keyword trigger.' },
              priority: { type: Type.STRING, description: "The priority level for the priority_changed trigger.", enum: ['High', 'Medium', 'Low'] }
            }
          }
        },
        required: ['type']
      },
      actions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['send_whatsapp_message', 'add_tag', 'change_crm_stage', 'wait'] },
            config: {
              type: Type.OBJECT,
              properties: {
                message: { type: Type.STRING },
                tag: { type: Type.STRING },
                stage: { type: Type.STRING },
                days: { type: Type.INTEGER }
              }
            }
          },
          required: ['type']
        }
      }
    },
    required: ['name', 'trigger', 'actions']
  }
};

const workflowSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            description: "An array of 2-3 distinct workflow suggestions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    trigger: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            config: { type: Type.OBJECT, properties: {
                                stage: { type: Type.STRING },
                                tag: { type: Type.STRING },
                                keyword: { type: Type.STRING },
                                priority: { type: Type.STRING }
                            }}
                        }
                    },
                    actions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING },
                                config: { type: Type.OBJECT, properties: {
                                    message: { type: Type.STRING },
                                    tag: { type: Type.STRING },
                                    stage: { type: Type.STRING },
                                    days: { type: Type.INTEGER }
                                }}
                            }
                        }
                    }
                }
            }
        }
    },
    required: ['suggestions']
};


class GeminiService {
    private ai: GoogleGenAI;
    private safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    constructor() {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set.");
        }
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    
    startChat(): Chat {
        const chat: Chat = this.ai.chats.create({
            model: 'gemini-2.0-flash',
            config: {
                systemInstruction: systemPrompt,
                safetySettings: this.safetySettings,
            },
        });
        return chat;
    }

    async getDashboardInsights(stats: DashboardStats, instances: WhatsAppInstance[]): Promise<string[]> {
        const systemInstruction = `
You are an AI business assistant for Flowtiva. Your goal is to provide a JSON array of approximately 20 short, concise, and actionable insights for the user based on their dashboard data.
The user is a business owner in Qatar. Be encouraging, professional, and vary the insights.
Each insight should be a complete sentence.

**Output Format:**
The output MUST be a valid JSON array of strings. Do not include any other text, explanations, or markdown formatting.
Example: ["Insight 1.", "Insight 2.", "Another useful tip."]

**Analysis Guidelines & Specific Instructions:**
- **Greetings & General Tips:** Start with a friendly welcome. Include general tips about exploring features like Workflows or Outreach Campaigns.
- **Instance Status:**
    - If there are no instances connected, your top priority is to guide the user to connect their first account (e.g., "Ready to get started? Click 'Connect New Account' to link your first WhatsApp number.").
    - If there are failed instances, generate insights about checking the logs and reconnecting (e.g., "It looks like one of your accounts needs attention. Check the logs to see why it failed.").
    - If all instances are running smoothly, provide positive feedback (e.g., "All your WhatsApp accounts are active and running smoothly. Great job!").
- **Contact & Message Activity:**
    - If total contacts are low, suggest running an outreach campaign to engage more people.
    - If total contacts are high, suggest using tags to segment the audience for targeted follow-ups.
    - If messages in the last 24h are high, praise the engagement (e.g., "Your customer engagement was high yesterday! Keep the momentum going.").
    - If messages are low, suggest a promotional message or checking if any instances are inactive.
- **Feature-Based Suggestions:**
    - If you see many contacts in the 'New' stage, suggest creating a workflow to automatically send a welcome message.
    - If the user has a high number of contacts but no active workflows, suggest building an automation to save time.
    - Remind the user they can customize the AI's personality in the instance settings for a unique brand voice.

**Data for Analysis:**
{
  "stats": ${JSON.stringify(stats)},
  "instances": ${JSON.stringify(instances.map(i => ({ status: i.status, agentType: i.agentType })))}
}
`;
        const fallbackInsights = ["Welcome! Connect your WhatsApp account to get started.", "Let's automate your conversations and accelerate your growth."];

        try {
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: systemInstruction,
                config: {
                    responseMimeType: "application/json",
                }
            });
            
            const rawResponseText = response.text;
            if (!rawResponseText) {
                return fallbackInsights;
            }

            const jsonMatch = rawResponseText.match(/\[.*\]/s);
            if (!jsonMatch) {
                console.error("Error generating insights: No JSON array found in response.", rawResponseText);
                return fallbackInsights;
            }
            const jsonStr = jsonMatch[0];
            const insights = JSON.parse(jsonStr);

            if (Array.isArray(insights) && insights.every(i => typeof i === 'string')) {
                return insights;
            }

            return fallbackInsights;
        } catch (error) {
            console.error("Error generating dashboard insights:", error);
            // Return a graceful fallback
            return fallbackInsights;
        }
    }

    async generateSystemPrompt(details: AgentDetails, useCase: 'business' | 'personal'): Promise<string> {
        let constructedPrompt: string;

        if (useCase === 'business') {
            constructedPrompt = businessPromptGenerationInstruction
                .replace('{businessName}', details.businessName || 'the business')
                .replace('{businessType}', details.businessType || 'various services')
                .replace('{services}', details.services || 'a range of products and services')
                .replace('{specificInstructions}', details.specificInstructions || 'None');
        } else { // personal
            constructedPrompt = personalPromptGenerationInstruction
                .replace(/{agentName}/g, details.agentName || 'AI Assistant')
                .replace('{agentPersonality}', details.agentPersonality || 'a helpful assistant')
                .replace('{knowledgeBase}', details.knowledgeBase || 'general knowledge')
                .replace('{specificInstructions}', details.specificInstructions || 'None');
        }
        
        try {
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: constructedPrompt,
                config: {
                    safetySettings: this.safetySettings
                }
            });
            return response.text || '';
        } catch (error) {
            console.error("Error generating system prompt:", error);
            throw new Error("Failed to generate AI prompt. Please check your connection or API key.");
        }
    }

    async generateTagsForConversation(messages: Pick<WhatsAppMessage, 'sender' | 'messageText'>[]): Promise<string[]> {
        // Don't tag very short conversations
        if (messages.length < 3) {
            return [];
        }

        const transcript = messages.map(msg => {
            const role = (msg.sender === 'user') ? 'User' : 'Agent';
            return `${role}: ${msg.messageText || '(Image sent)'}`;
        }).join('\n');

        const fullPrompt = `${tagGenerationInstruction}\n\n**Conversation Transcript:**\n${transcript}`;
        
        try {
            const response: GenerateContentResponse = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    safetySettings: this.safetySettings,
                }
            });

            const rawResponseText = response.text;
            if (!rawResponseText) {
                return [];
            }
            
            // More robust JSON parsing: find the JSON array within the response text.
            const jsonMatch = rawResponseText.match(/\[.*\]/s);
            if (!jsonMatch) {
                console.error("Error generating tags: No JSON array found in response.", rawResponseText);
                return [];
            }
            const tagsJsonStr = jsonMatch[0];
            const tags = JSON.parse(tagsJsonStr);

            if (Array.isArray(tags)) {
                // Sanitize and limit tags
                return tags
                    .map(t => typeof t === 'string' ? t.trim().toLowerCase() : '')
                    .filter(t => t) // remove empty strings
                    .slice(0, 5);
            }
            return [];
        } catch (error) {
            console.error("Error generating tags:", error);
            // Don't throw, just return empty array on failure to avoid breaking UI
            return [];
        }
    }

    async generateWorkflowFromPrompt(prompt: string): Promise<Partial<Workflow>> {
        const systemInstruction = `You are an intelligent workflow assistant. Your task is to analyze the user's request and convert it into a structured automation by calling the 'create_workflow' function. Infer a suitable name for the workflow. The user's request is: "${prompt}"`;

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: systemInstruction,
                config: {
                    tools: [{ functionDeclarations: [createWorkflowFunctionDeclaration] }]
                }
            });

            const functionCall = response.functionCalls?.[0];

            if (functionCall?.name === 'create_workflow' && functionCall.args) {
                const workflowData = functionCall.args as any;
                
                // Ensure actions is an array, as Gemini might hallucinate a single object
                const actions = Array.isArray(workflowData.actions) ? workflowData.actions : [workflowData.actions].filter(Boolean);

                // Add client-side ID for React keys
                workflowData.actions = actions.map((action: any) => ({
                    ...action,
                    id: Math.random().toString(36).substring(2, 9)
                }));
                return workflowData as Partial<Workflow>;
            }

            throw new Error("Could not generate a valid workflow from the prompt. The AI did not return the expected function call.");
        } catch (error) {
             console.error("Error generating workflow from prompt:", error);
            throw new Error("Failed to generate workflow. Please try rephrasing your request.");
        }
    }

    async generateWorkflowSuggestions(contacts: WhatsAppContact[]): Promise<Partial<Workflow>[]> {
        const totalContacts = contacts.length;
        if (totalContacts === 0) return [];

        const stageCounts = contacts.reduce((acc, contact) => {
            const stage = contact.crm_stage || 'New';
            acc[stage] = (acc[stage] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const context = `
        You are an expert automation consultant for Flowtiva. Your goal is to analyze user data and suggest 2-3 highly relevant and useful workflow automations.
        The user is a business in Qatar. The suggestions should be practical and solve common business problems.
        Output a valid JSON object that strictly adheres to the provided schema.

        **Analysis Guidelines:**
        - If there are many contacts in the 'New' stage, suggest a welcome workflow.
        - If there are contacts in the 'Lost' stage, suggest a re-engagement workflow after a delay.
        - If 'Proposal' is a common stage, suggest a follow-up after a few days if they don't reply.
        - A general-purpose "triage" workflow that tags messages with keywords like 'quote' or 'support' is always useful.
        
        **User Data Summary:**
        - Total Contacts: ${totalContacts}
        - Stage Distribution: ${JSON.stringify(stageCounts)}
        `;

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: context,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: workflowSuggestionSchema
                }
            });

            const rawJson = (response.text || '').trim();
            const result = JSON.parse(rawJson);
            
            if (result && result.suggestions && Array.isArray(result.suggestions)) {
                 return result.suggestions.map((wf: any) => ({
                    ...wf,
                    actions: (wf.actions || []).map((act: any) => ({
                        ...act,
                        id: Math.random().toString(36).substring(2, 9)
                    }))
                }));
            }
            return [];
        } catch (error) {
            console.error("Error generating workflow suggestions:", error);
            return [];
        }
    }
}

export const geminiService = new GeminiService();
