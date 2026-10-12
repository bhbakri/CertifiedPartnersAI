// Replace each body with your approved email template later. Keep the IDs stable.
export const templates = [
  { id: 'minimal', name: 'Minimal introduction', min: 0, max: 2,
    description: 'Introduce the sender briefly; ask who handles the relevant work. Avoid specific claims.',
    body: 'Hi {{greeting}},\n\nI’m {{sender_name}} from {{sender_company}}. {{sender_offer}}\n\nWould you be the right person to discuss this?\n\n{{sender_name}}' },
  { id: 'basic', name: 'Company and role introduction', min: 3, max: 5,
    description: 'Use known company, industry, or role context and a short low-pressure question.',
    body: 'Hi {{greeting}},\n\nI’m {{sender_name}} from {{sender_company}}. {{known_company_or_role_context}}\n\n{{sender_offer}} Would a brief conversation be useful?\n\n{{sender_name}}' },
  { id: 'targeted', name: 'Problem-focused outreach', min: 6, max: 8,
    description: 'Connect available business context to a possible need. Phrase inferred pain points as questions.',
    body: 'Hi {{greeting}},\n\n{{known_business_context}} {{possible_need_question}}\n\n{{relevant_offer_if_supported}} Would you be open to a short workflow discussion?\n\n{{sender_name}}' },
  { id: 'detailed', name: 'Highly informed outreach', min: 9, max: 12,
    description: 'Choose at most two useful facts; connect signal, possible need, and offer without dumping all data.',
    body: 'Hi {{greeting}},\n\n{{one_or_two_relevant_facts}} {{possible_need_question}}\n\n{{supported_offer_connection}} {{appropriate_call_to_action}}\n\n{{sender_name}}' }
];
