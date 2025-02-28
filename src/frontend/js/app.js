/**
 * SmartAgentDeploy - Frontend Application
 * Handles user interactions and API calls
 */

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let priceChart = null;
let mockPriceData = [];

// DOM elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const loginBtn = document.getElementById('loginBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const deployForm = document.getElementById('deployForm');
const riskLevel = document.getElementById('riskLevel');
const riskValue = document.getElementById('riskValue');
const agentsTableBody = document.getElementById('agentsTableBody');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Setup event listeners
    setupEventListeners();
    
    // Check if user is logged in
    updateAuthUI();
    
    // Initialize price chart
    initializePriceChart();
    
    // Load user agents if logged in
    if (authToken) {
        loadUserAgents();
    }
}

/**
 * Setup event listeners for UI elements
 */
function setupEventListeners() {
    // Risk level slider
    if (riskLevel) {
        riskLevel.addEventListener('input', (e) => {
            riskValue.textContent = e.target.value;
        });
    }
    
    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Deploy form
    if (deployForm) {
        deployForm.addEventListener('submit', handleDeploy);
    }
    
    // Connect wallet button
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', handleConnectWallet);
    }
    
    // Market dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const symbol = e.target.textContent;
            document.getElementById('marketDropdown').textContent = symbol;
            updatePriceChart(symbol);
        });
    });
}

/**
 * Update UI based on authentication status
 */
function updateAuthUI() {
    if (authToken && currentUser) {
        // User is logged in
        loginBtn.textContent = currentUser.username;
        loginBtn.classList.add('btn-success');
        loginBtn.classList.remove('btn-primary');
        
        // Add logout dropdown to login button
        loginBtn.setAttribute('data-bs-toggle', 'dropdown');
        loginBtn.removeAttribute('data-bs-target');
        
        // Create dropdown menu if it doesn't exist
        if (!document.getElementById('userDropdownMenu')) {
            const dropdownMenu = document.createElement('ul');
            dropdownMenu.className = 'dropdown-menu';
            dropdownMenu.id = 'userDropdownMenu';
            
            dropdownMenu.innerHTML = `
                <li><a class="dropdown-item" href="#profile">Profile</a></li>
                <li><a class="dropdown-item" href="#settings">Settings</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
            `;
            
            loginBtn.parentNode.appendChild(dropdownMenu);
            
            // Add logout event listener
            document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        }
    } else {
        // User is not logged in
        loginBtn.textContent = 'Login';
        loginBtn.classList.add('btn-primary');
        loginBtn.classList.remove('btn-success');
        loginBtn.setAttribute('data-bs-toggle', 'modal');
        loginBtn.setAttribute('data-bs-target', '#loginModal');
        
        // Remove dropdown menu if it exists
        const dropdownMenu = document.getElementById('userDropdownMenu');
        if (dropdownMenu) {
            dropdownMenu.remove();
        }
    }
}

/**
 * Initialize price chart
 */
function initializePriceChart() {
    const ctx = document.getElementById('priceChart');
    
    if (!ctx) return;
    
    // Generate mock data
    generateMockPriceData();
    
    // Create chart
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mockPriceData.map(d => d.time),
            datasets: [{
                label: 'BTC/USDT',
                data: mockPriceData.map(d => d.price),
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

/**
 * Generate mock price data for chart
 */
function generateMockPriceData() {
    const now = new Date();
    const hours = 24;
    
    mockPriceData = [];
    let price = 50000; // Starting price
    
    for (let i = hours; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        
        // Random price change
        const change = (Math.random() - 0.5) * 200;
        price += change;
        
        mockPriceData.push({
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: price
        });
    }
}

/**
 * Update price chart with new data
 * @param {string} symbol - Trading pair symbol
 */
function updatePriceChart(symbol) {
    // In a real app, this would fetch data from the API
    // For now, we'll just update the mock data
    
    let basePrice;
    if (symbol === 'BTC/USDT') {
        basePrice = 50000;
    } else if (symbol === 'ETH/USDT') {
        basePrice = 3000;
    } else if (symbol === 'SOL/USDT') {
        basePrice = 100;
    } else {
        basePrice = 1000;
    }
    
    // Generate new mock data
    mockPriceData = [];
    let price = basePrice;
    const now = new Date();
    const hours = 24;
    
    for (let i = hours; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        
        // Random price change
        const change = (Math.random() - 0.5) * (basePrice * 0.01);
        price += change;
        
        mockPriceData.push({
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: price
        });
    }
    
    // Update chart
    priceChart.data.labels = mockPriceData.map(d => d.time);
    priceChart.data.datasets[0].data = mockPriceData.map(d => d.price);
    priceChart.data.datasets[0].label = symbol;
    priceChart.update();
}

/**
 * Load user agents from API
 */
async function loadUserAgents() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/agents`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load agents');
        }
        
        const data = await response.json();
        
        // Update agents table
        updateAgentsTable(data.agents);
    } catch (error) {
        console.error('Error loading agents:', error);
        showNotification('Failed to load agents', 'error');
    }
}

/**
 * Update agents table with data
 * @param {Array} agents - List of user agents
 */
function updateAgentsTable(agents) {
    if (!agentsTableBody) return;
    
    if (!agents || agents.length === 0) {
        agentsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No agents deployed yet. Create your first agent above!</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    agents.forEach(agent => {
        // Format status badge
        let statusBadge;
        switch (agent.status) {
            case 'active':
                statusBadge = '<span class="badge bg-success">Active</span>';
                break;
            case 'inactive':
                statusBadge = '<span class="badge bg-secondary">Inactive</span>';
                break;
            case 'trained':
                statusBadge = '<span class="badge bg-primary">Trained</span>';
                break;
            case 'training':
                statusBadge = '<span class="badge bg-warning">Training</span>';
                break;
            default:
                statusBadge = '<span class="badge bg-light text-dark">Unknown</span>';
        }
        
        // Format performance
        let performance = 'N/A';
        if (agent.performanceMetrics && agent.performanceMetrics.roi !== undefined) {
            const roi = agent.performanceMetrics.roi;
            const roiClass = roi >= 0 ? 'performance-positive' : 'performance-negative';
            const roiSign = roi >= 0 ? '+' : '';
            performance = `<span class="${roiClass}">${roiSign}${roi.toFixed(2)}%</span>`;
        }
        
        html += `
            <tr>
                <td>${agent.name}</td>
                <td>${agent.strategyType}</td>
                <td>${agent.riskLevel}</td>
                <td>${statusBadge}</td>
                <td>${performance}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewAgent('${agent.agentId}')">View</button>
                        <button class="btn btn-outline-success" onclick="trainAgent('${agent.agentId}')" ${agent.status === 'training' ? 'disabled' : ''}>Train</button>
                        <button class="btn btn-outline-danger" onclick="deleteAgent('${agent.agentId}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    agentsTableBody.innerHTML = html;
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error('Login failed');
        }
        
        const data = await response.json();
        
        // Save auth token and user data
        authToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update UI
        updateAuthUI();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        modal.hide();
        
        // Load user agents
        loadUserAgents();
        
        showNotification('Login successful', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please check your credentials.', 'error');
    }
}

/**
 * Handle register form submission
 * @param {Event} e - Form submit event
 */
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        if (!response.ok) {
            throw new Error('Registration failed');
        }
        
        const data = await response.json();
        
        // Save auth token and user data
        authToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update UI
        updateAuthUI();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        modal.hide();
        
        showNotification('Registration successful', 'success');
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'error');
    }
}

/**
 * Handle agent deployment form submission
 * @param {Event} e - Form submit event
 */
async function handleDeploy(e) {
    e.preventDefault();
    
    if (!authToken) {
        showNotification('Please login to deploy an agent', 'warning');
        return;
    }
    
    const name = document.getElementById('agentName').value;
    const strategyType = document.getElementById('strategyType').value;
    const riskLevel = parseFloat(document.getElementById('riskLevel').value);
    
    try {
        const response = await fetch(`${API_BASE_URL}/agents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name,
                strategyType,
                riskLevel,
                description: `${name} - ${strategyType} strategy with risk level ${riskLevel}`
            })
        });
        
        if (!response.ok) {
            throw new Error('Agent deployment failed');
        }
        
        const data = await response.json();
        
        // Reset form
        deployForm.reset();
        riskValue.textContent = '0.5';
        
        // Reload agents
        loadUserAgents();
        
        showNotification('Agent deployed successfully', 'success');
    } catch (error) {
        console.error('Deployment error:', error);
        showNotification('Agent deployment failed. Please try again.', 'error');
    }
}

/**
 * Handle wallet connection
 */
async function handleConnectWallet() {
    // In a real app, this would connect to MetaMask or other wallet
    // For now, we'll just toggle the button state
    
    if (connectWalletBtn.classList.contains('connected')) {
        // Disconnect wallet
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.classList.remove('connected');
    } else {
        // Connect wallet
        connectWalletBtn.textContent = '0x1234...5678';
        connectWalletBtn.classList.add('connected');
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    // Clear auth data
    authToken = null;
    currentUser = null;
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Update UI
    updateAuthUI();
    
    // Clear agents table
    if (agentsTableBody) {
        agentsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No agents deployed yet. Create your first agent above!</td>
            </tr>
        `;
    }
    
    showNotification('Logged out successfully', 'success');
}

/**
 * View agent details
 * @param {string} agentId - ID of the agent to view
 */
function viewAgent(agentId) {
    // In a real app, this would navigate to agent details page
    console.log('View agent:', agentId);
    showNotification('Agent details view not implemented yet', 'info');
}

/**
 * Train an agent
 * @param {string} agentId - ID of the agent to train
 */
async function trainAgent(agentId) {
    if (!authToken) {
        showNotification('Please login to train an agent', 'warning');
        return;
    }
    
    try {
        // Show loading state
        const button = document.querySelector(`button[onclick="trainAgent('${agentId}')"]`);
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Training...';
        
        // In a real app, this would call the API to train the agent
        // For now, we'll just simulate a delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update UI
        button.disabled = false;
        button.innerHTML = 'Train';
        
        showNotification('Agent training initiated', 'success');
        
        // Reload agents
        loadUserAgents();
    } catch (error) {
        console.error('Training error:', error);
        showNotification('Agent training failed. Please try again.', 'error');
    }
}

/**
 * Delete an agent
 * @param {string} agentId - ID of the agent to delete
 */
async function deleteAgent(agentId) {
    if (!authToken) {
        showNotification('Please login to delete an agent', 'warning');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this agent?')) {
        return;
    }
    
    try {
        // In a real app, this would call the API to delete the agent
        // For now, we'll just simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        showNotification('Agent deleted successfully', 'success');
        
        // Reload agents
        loadUserAgents();
    } catch (error) {
        console.error('Deletion error:', error);
        showNotification('Agent deletion failed. Please try again.', 'error');
    }
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // Check if notification container exists
    let container = document.getElementById('notificationContainer');
    
    if (!container) {
        // Create container
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
} 