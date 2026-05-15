const agents = [
    { id: 'val', name: 'Validation', icon: 'check-square' },
    { id: 'photo', name: 'Photo Analyst', icon: 'camera' },
    { id: 'hist', name: 'Historical', icon: 'history' },
    { id: 'class', name: 'Geologist', icon: 'brain' },
    { id: 'compl', name: 'Compliance', icon: 'shield-check' },
    { id: 'qa', name: 'Peer Review', icon: 'eye' },
    { id: 'summ', name: 'Executive', icon: 'file-text' },
    { id: 'log', name: 'DB Sync', icon: 'database' },
    { id: 'rep', name: 'Reporter', icon: 'printer' },
    { id: 'disp', name: 'Dispatch', icon: 'send' }
];

function init() {
    const grid = document.getElementById('agent-grid');
    agents.forEach(agent => {
        const card = document.createElement('div');
        card.className = 'agent-card';
        card.id = gent-;
        card.innerHTML = `
            <div class=\"agent-icon\"><i data-lucide=\"\\"></i></div>
            <div class=\"agent-name\">\</div>
        `;
        grid.appendChild(card);
    });
    lucide.createIcons();

    document.getElementById('start-btn').addEventListener('click', launchPipeline);
}

function addLog(agent, msg) {
    const feed = document.getElementById('terminal-feed');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `
        <span class=\"log-time\">[\]</span>
        <span class=\"log-agent\">\</span>
        <span class=\"log-msg\">\</span>
    `;
    feed.appendChild(entry);
    feed.scrollTop = feed.scrollHeight;
}

async function launchPipeline() {
    const btn = document.getElementById('start-btn');
    const status = document.getElementById('global-status');
    btn.disabled = true;
    status.innerHTML = '<span class=\"pulse\"></span> Processing...';
    status.style.color = 'var(--accent-blue)';

    // Reset agents
    document.querySelectorAll('.agent-card').forEach(c => {
        c.classList.remove('working', 'done', 'failed');
    });

    for (const agent of agents) {
        const card = document.getElementById(gent-\);
        card.classList.add('working');
        addLog(agent.name.toUpperCase(), 'Analyzing dataset...');
        
        // Simulate backend work
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        
        card.classList.remove('working');
        card.classList.add('done');
        addLog(agent.name.toUpperCase(), 'Task completed successfully.');

        // Update UI details incrementally
        if (agent.id === 'class') {
            document.getElementById('uscs-display').textContent = 'CH';
            document.getElementById('const-display').textContent = 'Stiff';
        }
        if (agent.id === 'qa') {
            document.getElementById('qa-display').textContent = '98%';
        }
    }

    status.innerHTML = '<span class=\"pulse\"></span> Pipeline Complete';
    status.style.color = 'var(--accent-emerald)';
    btn.disabled = false;
    addLog('SYSTEM', 'All agents completed. Report generated.');
}

document.addEventListener('DOMContentLoaded', init);
