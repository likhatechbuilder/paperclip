const url = 'http://localhost:3100/api/agents/85c02d02-33ab-4293-bf43-00fd2d1f5451';
const body = {
  adapterConfig: {
    cwd: 'F:\\012A_Github\\3D-Ai-Organizers',
    model: 'llama3.1',
    maxTurns: 20,
    system: 'You are Nova, the Lead Architect and interim CEO. Your primary role is to coordinate tasks, review log artifacts, and verify Sentinel\'s fixes. Stay extremely concise. Use your reading tools to examine logs.',
    options: {
      num_ctx: 16384,
      temperature: 0.1,
      top_p: 0.9
    },
    commandWhitelist: ['git', 'npm', 'pnpm', 'cat', 'mkdir', 'dir']
  }
};

fetch(url, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
.then(r => r.json())
.then(data => console.log('PATCH response:', data))
.catch(err => console.error('Error:', err));
