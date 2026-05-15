const workflowData = {
    "project": "#2026-G042",
    "template": "Geotechnical Investigation - Cored",
    "missingFields": [
        "Client Name",
        "DCP/SPT Data",
        "Stratigraphy interpretation",
        "Borehole Coordinates",
        "Author/Reviewer ID"
    ],
    "risk": {
        "level": "High",
        "count": 16,
        "fill": "80%"
    }
};

async function launchPipeline() {
    const btn = document.getElementById('auto-inject-btn');
    const statusBadge = document.querySelector('.status-badge');
    
    if (btn) btn.disabled = true;
    if (statusBadge) {
        statusBadge.textContent = 'Processing...';
        statusBadge.style.color = '#38bdf8';
    }

    try {
        const response = await fetch('http://localhost:8000/api/v1/log-interval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: "2026-G042",
                project_name: "Sample Project",
                borehole_id: "BH-101",
                depth_from: 0.0,
                depth_to: 1.5
            })
        });

        if (!response.ok) throw new Error('Pipeline failed');
        
        const data = await response.json();
        console.log('Pipeline Success:', data);
        
        if (statusBadge) {
            statusBadge.textContent = 'Completed';
            statusBadge.style.color = '#10b981';
        }
        
        // Move to Review step
        const steps = document.querySelectorAll('.step');
        steps.forEach(s => {
            s.classList.remove('active');
            s.classList.add('completed');
        });
        steps[3].classList.add('active'); // Review step
        steps[3].classList.remove('completed');

    } catch (error) {
        console.error(error);
        if (statusBadge) {
            statusBadge.textContent = 'Error';
            statusBadge.style.color = '#ef4444';
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}

function init() {
    const fieldsContainer = document.getElementById('missing-fields-container');
    const projectIdElement = document.getElementById('project-id');
    const autoInjectBtn = document.getElementById('auto-inject-btn');
    
    if (projectIdElement) {
        projectIdElement.textContent = workflowData.project;
    }

    if (fieldsContainer) {
        fieldsContainer.innerHTML = '';
        workflowData.missingFields.forEach(field => {
            const item = document.createElement('div');
            item.className = 'field-item';
            item.innerHTML = `
                <span class="field-name">${field}</span>
                <span class="field-status">REQUIRED</span>
            `;
            fieldsContainer.appendChild(item);
        });
    }

    if (autoInjectBtn) {
        autoInjectBtn.addEventListener('click', launchPipeline);
    }

    // Stepper interaction
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        step.addEventListener('click', () => {
            steps.forEach(s => {
                s.classList.remove('active');
                s.classList.remove('completed');
            });
            for(let i=0; i<index; i++) {
                steps[i].classList.add('completed');
            }
            step.classList.add('active');
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
