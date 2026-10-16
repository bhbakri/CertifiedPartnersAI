export const templates = [
  {
    id: 'minimal',
    name: 'Minimal introduction',
    min: 0,
    max: 2,
    description:
      'Write a short introduction and find the right contact. ' +
      'Use the company or contact name if available. ' +
      'Do not assume their role, industry, problems, or business needs.',
    body: `Subject: The right contact at {{company_name}}

Hi {{greeting}},

I’m {{sender_name}} from {{sender_company}}. {{sender_offer_one_sentence}}

Who would be the right person at {{company_name}} to speak with about this?

Best,
{{sender_name}}`
  },

  {
    id: 'basic',
    name: 'Company and role introduction',
    min: 3,
    max: 5,
    description:
      'Explain why the outreach is relevant using the known role or industry. ' +
      'Ask whether the service falls within their responsibilities. ' +
      'Do not assume a specific problem or invent a business event.',
    body: `Subject: A question about {{role_or_industry_topic}}

Hi {{greeting}},

{{role_or_industry_relevance_sentence}}

I’m {{sender_name}} from {{sender_company}}. {{sender_offer_one_sentence}}

Is this an area you oversee, and would a brief introduction be useful?

Best,
{{sender_name}}`
  },

  {
    id: 'targeted',
    name: 'Problem-focused outreach',
    min: 6,
    max: 8,
    description:
      'Lead with a question about a supplied possible pain point or workflow. ' +
      'Connect the approved service description to that workflow without ' +
      'promising results. Suggest a focused workflow discussion. ' +
      'If no pain point is supplied, ask an exploratory question grounded ' +
      'in the known business context.',
    body: `Subject: Reviewing {{workflow_topic}} at {{company_name}}

Hi {{greeting}},

{{specific_workflow_question}}

I’m {{sender_name}} from {{sender_company}}. {{supported_service_connection}}

Would you be open to a short discussion about how your team currently handles {{workflow_topic}} and whether an assessment would be useful?

Best,
{{sender_name}}`
  },

  {
    id: 'detailed',
    name: 'Highly informed outreach',
    min: 9,
    max: 12,
    description:
      'Open with a supplied business signal or relevant recorded interaction. ' +
      'Connect that context to a possible workflow need, framed as a question. ' +
      'Suggest a supported offer and a specific discussion topic. ' +
      'Use at most two relevant personalization facts. ' +
      'Do not call an undated signal recent or imply an unrecorded conversation. ' +
      'If a signal, interaction, or supported offer is missing, omit it ' +
      'and use the strongest available context.',
    body: `Subject: {{specific_business_context_topic}}

Hi {{greeting}},

{{business_signal_or_relationship_context}} {{context_linked_workflow_question}}

I’m {{sender_name}} from {{sender_company}}. {{supported_offer_connection}}

Would you be open to {{supported_next_step}} focused on {{specific_discussion_topic}}?

Best,
{{sender_name}}`
  }
];