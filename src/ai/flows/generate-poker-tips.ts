// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview Provides AI-generated poker tips tailored to the user's recent activity and skill level.
 *
 * - generatePokerTips - A function that generates personalized poker tips.
 * - GeneratePokerTipsInput - The input type for the generatePokerTips function.
 * - GeneratePokerTipsOutput - The return type for the generatePokerTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePokerTipsInputSchema = z.object({
  recentActivity: z
    .string()
    .describe('A summary of the user\'s recent poker playing activity.'),
  skillLevel: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .describe('The user\'s self-assessed poker skill level.'),
  interests: z.string().describe('The user\'s specific interests within poker.'),
});
export type GeneratePokerTipsInput = z.infer<typeof GeneratePokerTipsInputSchema>;

const GeneratePokerTipsOutputSchema = z.object({
  tips: z.array(z.string()).describe('A list of AI-generated poker tips.'),
});
export type GeneratePokerTipsOutput = z.infer<typeof GeneratePokerTipsOutputSchema>;

export async function generatePokerTips(input: GeneratePokerTipsInput): Promise<GeneratePokerTipsOutput> {
  return generatePokerTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePokerTipsPrompt',
  input: {schema: GeneratePokerTipsInputSchema},
  output: {schema: GeneratePokerTipsOutputSchema},
  prompt: `You are an expert poker coach providing personalized tips to players.

  Based on the player's recent activity, skill level, and interests, provide 3 concise and actionable poker tips.

  Recent Activity: {{{recentActivity}}}
  Skill Level: {{{skillLevel}}}
  Interests: {{{interests}}}

  Format the output as a numbered list of strings.`,
});

const generatePokerTipsFlow = ai.defineFlow(
  {
    name: 'generatePokerTipsFlow',
    inputSchema: GeneratePokerTipsInputSchema,
    outputSchema: GeneratePokerTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
