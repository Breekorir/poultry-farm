
// =====================================================================================
// frontend/public/app.js
// =====================================================================================

// --- Global DOM Elements ---
const pageContent = document.getElementById('page-content');
const navLinks = document.querySelectorAll('.sidebar-link');
const modal = document.getElementById('notificationModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
document.getElementById('currentYear').textContent = new Date().getFullYear();

let lastFocusedElement = null;

// --- Modal & Utility Functions ---
function showModal(title, message, isError = false) {
    lastFocusedElement = document.activeElement;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalTitle.style.color = isError ? '#dc2626' : '#166534';
    modal.style.display = 'flex';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('tabindex', '-1');
    modal.focus();
}

function closeModal() {
    modal.style.display = 'none';
    modal.removeAttribute('aria-modal');
    modal.removeAttribute('role');
    modal.removeAttribute('tabindex');
    if (lastFocusedElement) lastFocusedElement.focus();
}
window.onclick = (event) => {
    if (event.target == modal) closeModal();
};

async function apiRequest(endpoint, method = 'GET', data = null) {
    const config = { method, headers: {} };
    if (data) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
    }
    try {
        // Show loading indicator
        showLoading(true);
        const response = await fetch(`/api${endpoint}`, config);
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || 'An unknown network error occurred.');
        }
        return responseData;
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        showModal('API Error', error.message, true);
        throw error;
    } finally {
        // Hide loading indicator
        showLoading(false);
    }
}

// --- Loading Indicator ---
const loadingIndicator = document.createElement('div');
loadingIndicator.id = 'loadingIndicator';
loadingIndicator.style.position = 'fixed';
loadingIndicator.style.top = '0';
loadingIndicator.style.left = '0';
loadingIndicator.style.width = '100%';
loadingIndicator.style.height = '100%';
loadingIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
loadingIndicator.style.display = 'flex';
loadingIndicator.style.justifyContent = 'center';
loadingIndicator.style.alignItems = 'center';
loadingIndicator.style.zIndex = '2000';
loadingIndicator.style.fontSize = '1.5rem';
loadingIndicator.style.color = '#166534';
loadingIndicator.style.fontWeight = 'bold';
loadingIndicator.style.backdropFilter = 'blur(2px)';
loadingIndicator.textContent = 'Loading...';
loadingIndicator.style.display = 'none';
document.body.appendChild(loadingIndicator);

function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// --- Page Rendering Functions ---

function renderDashboard() {
    pageContent.innerHTML = `<h2 class="text-3xl font-semibold text-gray-800 mb-6">Dashboard</h2>`;
    apiRequest('/dashboard-stats').then(stats => {
        const dashboardHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="text-lg font-medium text-gray-600">Active Flocks</h3><p class="text-4xl font-bold text-green-600">${stats.totalFlocks || 0}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="text-lg font-medium text-gray-600">Total Birds</h3><p class="text-4xl font-bold text-green-600">${stats.totalBirds || 0}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="text-lg font-medium text-gray-600">Eggs Today</h3><p class="text-4xl font-bold text-green-600">${stats.eggsToday || 0}</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg"><h3 class="text-lg font-medium text-gray-600">Revenue (Last 30d)</h3><p class="text-4xl font-bold text-green-600">Ksh ${parseFloat(stats.revenueLast30Days || 0).toFixed(2)}</p></div>
            </div>
        `;
        pageContent.innerHTML += dashboardHTML;
    }).catch(err => pageContent.innerHTML += `<p class="text-red-500">Error loading dashboard data.</p>`);
}

// Simplified function to render a page with a form and a list
function renderGenericPage({ pageTitle, addBtnText, formId, formHtml, listId, listTitle, loadListFunc }) {
    pageContent.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-semibold text-gray-800">${pageTitle}</h2>
            <button id="addBtn" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">${addBtnText}</button>
        </div>
        <div id="formContainer" class="bg-white p-6 rounded-xl shadow-lg mb-6" style="display: none;">
            <h3 class="text-xl font-semibold text-gray-700 mb-4">${addBtnText}</h3>
            ${formHtml}
        </div>
        <div class="bg-white p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold text-gray-700 mb-4">${listTitle}</h3>
            <div id="${listId}" class="overflow-x-auto"><p>Loading...</p></div>
        </div>
    `;

    document.getElementById('addBtn').onclick = () => document.getElementById('formContainer').style.display = 'block';
    document.getElementById('cancelBtn').onclick = () => document.getElementById('formContainer').style.display = 'none';
    
    loadListFunc();
}


// --- SALES ---
function renderSalesPage() {
    const formHtml = `
        <form id="addSaleForm" class="space-y-4">
            <div><label for="item" class="block text-sm font-medium text-gray-700">Item Sold</label><input type="text" name="item" required class="mt-2 block w-full border-2 border-green-600 bg-green-100 rounded-md shadow-md text-lg font-semibold focus:ring-4 focus:ring-green-400 focus:border-green-700"></div>
            <div><label for="quantity" class="block text-sm font-medium text-gray-700">Quantity</label><input type="number" step="0.01" name="quantity" required class="mt-2 block w-full border-2 border-green-600 bg-green-100 rounded-md shadow-md text-lg font-semibold focus:ring-4 focus:ring-green-400 focus:border-green-700"></div>
            <div><label for="unitPrice" class="block text-sm font-medium text-gray-700">Unit Price (Ksh)</label><input type="number" step="0.01" name="unitPrice" required class="mt-2 block w-full border-2 border-green-600 bg-green-100 rounded-md shadow-md text-lg font-semibold focus:ring-4 focus:ring-green-400 focus:border-green-700"></div>
            <div><label for="saleDate" class="block text-sm font-medium text-gray-700">Date of Sale</label><input type="date" name="saleDate" required class="mt-2 block w-full border-2 border-green-600 bg-green-100 rounded-md shadow-md text-lg font-semibold focus:ring-4 focus:ring-green-400 focus:border-green-700" value="${new Date().toISOString().slice(0,10)}"></div>
            <div><label for="customer" class="block text-sm font-medium text-gray-700">Customer (Optional)</label><input type="text" name="customer" class="mt-2 block w-full border-2 border-green-600 bg-green-100 rounded-md shadow-md text-lg font-semibold focus:ring-4 focus:ring-green-400 focus:border-green-700"></div>
            <button type="submit" class="btn-primary">Save Sale</button>
            <button type="button" id="cancelBtn" class="btn-secondary">Cancel</button>
        </form>
    `;
    renderGenericPage({
        pageTitle: 'Sales Records', addBtnText: 'Add New Sale', formId: 'addSaleForm',
        formHtml, listId: 'salesList', listTitle: 'Recent Sales', loadListFunc: loadSales
    });
    document.getElementById('addSaleForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this).entries());
        const result = await apiRequest('/sales', 'POST', data);
        if (result.success) {
            showModal('Success', result.message);
            this.reset();
            document.getElementById('formContainer').style.display = 'none';
            loadSales();
        }
    });
}

async function loadSales() {
    const listDiv = document.getElementById('salesList');
    try {
        const sales = await apiRequest('/sales');
        if (sales && sales.length > 0) {
            listDiv.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200 table-auto">
                    <thead class="bg-gray-50"><tr>
                        <th class="th-cell px-4 py-2">Date</th><th class="th-cell px-4 py-2">Item</th><th class="th-cell px-4 py-2 text-right">Quantity</th>
                        <th class="th-cell px-4 py-2 text-right">Total Price (Ksh)</th><th class="th-cell px-4 py-2">Customer</th>
                    </tr></thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${sales.map(s => `
                            <tr>
                                <td class="td-cell px-4 py-2">${new Date(s.saleDate).toLocaleDateString()}</td>
                                <td class="td-cell px-4 py-2 font-medium">${s.item}</td>
                                <td class="td-cell px-4 py-2 text-right">${s.quantity}</td>
                                <td class="td-cell px-4 py-2 text-right">${s.formattedTotalPrice}</td>
                                <td class="td-cell px-4 py-2">${s.customer || 'N/A'}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;
        } else {
            listDiv.innerHTML = '<p class="text-gray-500">No sales records found.</p>';
        }
    } catch (error) {
        listDiv.innerHTML = '<p class="text-red-500">Error loading sales records.</p>';
    }
}

// --- VACCINATIONS ---
function renderVaccinationsPage() {
    const formHtml = `
        <form id="addVaccinationForm" class="space-y-4">
            <div><label for="flockId" class="block text-sm font-medium text-gray-700">Flock</label><select name="flockId" id="vaccinationFlockId" required class="mt-1 block w-full input"><option>Loading...</option></select></div>
            <div><label for="vaccineName" class="block text-sm font-medium text-gray-700">Vaccine Name</label><input type="text" name="vaccineName" required class="mt-1 block w-full input"></div>
            <div><label for="method" class="block text-sm font-medium text-gray-700">Method</label><input type="text" name="method" placeholder="e.g., Drinking Water" class="mt-1 block w-full input"></div>
            <div><label for="vaccinationDate" class="block text-sm font-medium text-gray-700">Date</label><input type="date" name="vaccinationDate" required class="mt-1 block w-full input" value="${new Date().toISOString().slice(0,10)}"></div>
            <div><label for="notes" class="block text-sm font-medium text-gray-700">Notes</label><textarea name="notes" rows="3" class="mt-1 block w-full input"></textarea></div>
            <button type="submit" class="btn-primary">Save Record</button>
            <button type="button" id="cancelBtn" class="btn-secondary">Cancel</button>
        </form>
    `;
    renderGenericPage({
        pageTitle: 'Vaccination Program', addBtnText: 'Add Vaccination Record', formId: 'addVaccinationForm',
        formHtml, listId: 'vaccinationList', listTitle: 'Vaccination History', loadListFunc: loadVaccinations
    });
    populateFlockDropdown('vaccinationFlockId');
    document.getElementById('addVaccinationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this).entries());
        const result = await apiRequest('/vaccinations', 'POST', data);
        if (result.success) {
            showModal('Success', result.message);
            this.reset();
            document.getElementById('formContainer').style.display = 'none';
            loadVaccinations();
        }
    });
}

async function loadVaccinations() {
    const listDiv = document.getElementById('vaccinationList');
    try {
        const records = await apiRequest('/vaccinations');
        if (records && records.length > 0) {
            listDiv.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                     <thead class="bg-gray-50"><tr>
                        <th class="th-cell">Date</th><th class="th-cell">Flock</th><th class="th-cell">Vaccine</th>
                        <th class="th-cell">Method</th><th class="th-cell">Notes</th>
                    </tr></thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${records.map(v => `
                            <tr>
                                <td class="td-cell">${new Date(v.vaccinationDate).toLocaleDateString()}</td>
                                <td class="td-cell font-medium">${v.flockName}</td>
                                <td class="td-cell">${v.vaccineName}</td>
                                <td class="td-cell">${v.method || 'N/A'}</td>
                                <td class="td-cell">${v.notes || ''}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;
        } else {
            listDiv.innerHTML = '<p class="text-gray-500">No vaccination records found.</p>';
        }
    } catch (error) {
        listDiv.innerHTML = '<p class="text-red-500">Error loading vaccination records.</p>';
    }
}

// Helper to populate flock dropdowns
async function populateFlockDropdown(selectElementId) {
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement) return;
    try {
        const flocks = await apiRequest('/flocks');
        const activeFlocks = flocks.filter(f => f.status === 'active');
        if (activeFlocks && activeFlocks.length > 0) {
            selectElement.innerHTML = '<option value="">Select a Flock</option>';
            activeFlocks.forEach(flock => {
                selectElement.innerHTML += `<option value="${flock.id}">${flock.name} (${flock.breed})</option>`;
            });
        } else {
            selectElement.innerHTML = '<option value="">No active flocks available</option>';
        }
    } catch (error) {
        selectElement.innerHTML = '<option value="">Error loading flocks</option>';
    }
}


// --- Navigation Router ---
const pageRenderers = {
    dashboard: renderDashboard,
    sales: renderSalesPage,
    vaccinations: renderVaccinationsPage,
    flocks: renderFlocksPage,
    feed: renderFeedPage,
    eggs: renderEggsPage,
    mortality: renderMortalityPage,
};

// --- Flocks ---
function renderFlocksPage() {
    const formHtml = `
        <form id="addFlockForm" class="space-y-4">
            <div><label for="flockName" class="block text-sm font-medium text-gray-700">Flock Name</label><input type="text" name="flockName" required class="mt-1 block w-full input"></div>
            <div><label for="breed" class="block text-sm font-medium text-gray-700">Breed</label><input type="text" name="breed" required class="mt-1 block w-full input"></div>
            <div><label for="initialBirdCount" class="block text-sm font-medium text-gray-700">Initial Bird Count</label><input type="number" name="initialBirdCount" required class="mt-1 block w-full input"></div>
            <div><label for="acquisitionDate" class="block text-sm font-medium text-gray-700">Acquisition Date</label><input type="date" name="acquisitionDate" required class="mt-1 block w-full input" value="${new Date().toISOString().slice(0,10)}"></div>
            <div><label for="flockStatus" class="block text-sm font-medium text-gray-700">Status</label>
                <select name="flockStatus" required class="mt-1 block w-full input">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
            <button type="submit" class="btn-primary">Add Flock</button>
            <button type="button" id="cancelBtn" class="btn-secondary">Cancel</button>
        </form>
    `;
    renderGenericPage({
        pageTitle: 'Flocks', addBtnText: 'Add New Flock', formId: 'addFlockForm',
        formHtml, listId: 'flocksList', listTitle: 'Existing Flocks', loadListFunc: loadFlocks
    });
    document.getElementById('addFlockForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this).entries());
        const result = await apiRequest('/flocks', 'POST', data);
        if (result.success) {
            showModal('Success', result.message);
            this.reset();
            document.getElementById('formContainer').style.display = 'none';
            loadFlocks();
        }
    });
}

async function loadFlocks() {
    const listDiv = document.getElementById('flocksList');
    try {
        const flocks = await apiRequest('/flocks');
        if (flocks && flocks.length > 0) {
            listDiv.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200 table-auto">
                <thead class="bg-gray-50"><tr>
                    <th class="th-cell px-4 py-2">Name</th><th class="th-cell px-4 py-2">Breed</th><th class="th-cell px-4 py-2 text-right">Initial Count</th>
                    <th class="th-cell px-4 py-2 text-right">Current Count</th><th class="th-cell px-4 py-2">Acquisition Date</th><th class="th-cell px-4 py-2">Status</th>
                </tr></thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${flocks.map(f => `
                        <tr>
                            <td class="td-cell px-4 py-2 font-medium">${f.name}</td>
                            <td class="td-cell px-4 py-2">${f.breed}</td>
                            <td class="td-cell px-4 py-2 text-right">${f.initialBirdCount}</td>
                            <td class="td-cell px-4 py-2 text-right">${f.currentBirdCount}</td>
                            <td class="td-cell px-4 py-2">${new Date(f.acquisitionDate).toLocaleDateString()}</td>
                            <td class="td-cell px-4 py-2">${f.status}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
            `;
        } else {
            listDiv.innerHTML = '<p class="text-gray-500">No flocks found.</p>';
        }
    } catch (error) {
        listDiv.innerHTML = '<p class="text-red-500">Error loading flocks.</p>';
    }
}

// --- Feed ---
function renderFeedPage() {
    const formHtml = `
        <form id="addFeedForm" class="space-y-4">
            <div><label for="feedType" class="block text-sm font-medium text-gray-700">Feed Type</label><input type="text" name="feedType" required class="mt-1 block w-full input"></div>
            <div><label for="quantityKg" class="block text-sm font-medium text-gray-700">Quantity (Kg)</label><input type="number" step="0.01" name="quantityKg" required class="mt-1 block w-full input"></div>
            <div><label for="purchaseDate" class="block text-sm font-medium text-gray-700">Purchase Date</label><input type="date" name="purchaseDate" required class="mt-1 block w-full input" value="${new Date().toISOString().slice(0,10)}"></div>
            <div><label for="supplier" class="block text-sm font-medium text-gray-700">Supplier</label><input type="text" name="supplier" class="mt-1 block w-full input"></div>
            <button type="submit" class="btn-primary">Log Feed Purchase</button>
            <button type="button" id="cancelBtn" class="btn-secondary">Cancel</button>
        </form>
    `;
    renderGenericPage({
        pageTitle: 'Feed Stock', addBtnText: 'Add Feed Purchase', formId: 'addFeedForm',
        formHtml, listId: 'feedList', listTitle: 'Feed Purchase History', loadListFunc: loadFeed
    });
    document.getElementById('addFeedForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this).entries());
        const result = await apiRequest('/feed', 'POST', data);
        if (result.success) {
            showModal('Success', result.message);
            this.reset();
            document.getElementById('formContainer').style.display = 'none';
            loadFeed();
        }
    });
}

async function loadFeed() {
    const listDiv = document.getElementById('feedList');
    try {
        const feed = await apiRequest('/feed');
        if (feed && feed.length > 0) {
            listDiv.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50"><tr>
                        <th class="th-cell">Type</th><th class="th-cell text-right">Quantity (Kg)</th><th class="th-cell">Purchase Date</th><th class="th-cell">Supplier</th>
                    </tr></thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${feed.map(f => `
                            <tr>
                                <td class="td-cell font-medium">${f.type}</td>
                                <td class="td-cell text-right">${f.quantityKg}</td>
                                <td class="td-cell">${new Date(f.purchaseDate).toLocaleDateString()}</td>
                                <td class="td-cell">${f.supplier || ''}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;
        } else {
            listDiv.innerHTML = '<p class="text-gray-500">No feed purchase records found.</p>';
        }
    } catch (error) {
        listDiv.innerHTML = '<p class="text-red-500">Error loading feed purchase records.</p>';
    }
}

// --- Eggs ---
function renderEggsPage() {
    const formHtml = `
        <form id="addEggsForm" class="space-y-4">
            <div><label for="flockId" class="block text-sm font-medium text-gray-700">Flock</label><select name="flockId" id="eggsFlockId" required class="mt-1 block w-full input"><option>Loading...</option></select></div>
            <div><label for="date" class="block text-sm font-medium text-gray-700">Date</label><input type="date" name="date" required class="mt-1 block w-full input" value="${new Date().toISOString().slice(0,10)}"></div>
            <div><label for="quantity" class="block text-sm font-medium text-gray-700">Quantity</label><input type="number" name="quantity" required class="mt-1 block w-full input"></div>
            <div><label for="gradeA" class="block text-sm font-medium text-gray-700">Grade A</label><input type="number" name="gradeA" class="mt-1 block w-full input" /></div>
            <div><label for="gradeB" class="block text-sm font-medium text-gray-700">Grade B</label><input type="number" name="gradeB" class="mt-1 block w-full input" /></div>
            <button type="submit" class="btn-primary">Log Egg Collection</button>
            <button type="button" id="cancelBtn" class="btn-secondary">Cancel</button>
        </form>
    `;
    renderGenericPage({
        pageTitle: 'Egg Collection', addBtnText: 'Add Egg Collection', formId: 'addEggsForm',
        formHtml, listId: 'eggsList', listTitle: 'Egg Collection History', loadListFunc: loadEggs
    });
    populateFlockDropdown('eggsFlockId');
    document.getElementById('addEggsForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this).entries());
        const result = await apiRequest('/eggs', 'POST', data);
        if (result.success) {
            showModal('Success', result.message);
            this.reset();
            document.getElementById('formContainer').style.display = 'none';
            loadEggs();
        }
    });
}

async function loadEggs() {
    const listDiv = document.getElementById('eggsList');
    try {
        const eggs = await apiRequest('/eggs');
        if (eggs && eggs.length > 0) {
            listDiv.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50"><tr>
                        <th class="th-cell">Date</th><th class="th-cell">Flock</th><th class="th-cell text-right">Quantity</th>
                        <th class="th-cell text-right">Grade A</th><th class="th-cell text-right">Grade B</th>
                    </tr></thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${eggs.map(e => `
                            <tr>
                                <td class="td-cell">${new Date(e.date).toLocaleDateString()}</td>
                                <td class="td-cell font-medium">${e.flockName}</td>
                                <td class="td-cell text-right">${e.quantity}</td>
                                <td class="td-cell text-right">${e.gradeA || 0}</td>
                                <td class="td-cell text-right">${e.gradeB || 0}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;
        } else {
            listDiv.innerHTML = '<p class="text-gray-500">No egg collection records found.</p>';
        }
    } catch (error) {
        listDiv.innerHTML = '<p class="text-red-500">Error loading egg collection records.</p>';
    }
}

// --- Mortality ---
function renderMortalityPage() {
    const formHtml = `
        <form id="addMortalityForm" class="space-y-4">
            <div><label for="flockId" class="block text-sm font-medium text-gray-700">Flock</label><select name="flockId" id="mortalityFlockId" required class="mt-1 block w-full input"><option>Loading...</option></select></div>
            <div><label for="date" class="block text-sm font-medium text-gray-700">Date</label><input type="date" name="date" required class="mt-1 block w-full input" value="${new Date().toISOString().slice(0,10)}"></div>
            <div><label for="count" class="block text-sm font-medium text-gray-700">Count</label><input type="number" name="count" required class="mt-1 block w-full input"></div>
            <div><label for="cause" class="block text-sm font-medium text-gray-700">Cause</label><input type="text" name="cause" class="mt-1 block w-full input"></div>
            <button type="submit" class="btn-primary">Record Mortality</button>
            <button type="button" id="cancelBtn" class="btn-secondary">Cancel</button>
        </form>
    `;
    renderGenericPage({
        pageTitle: 'Mortality Tracking', addBtnText: 'Add Mortality Record', formId: 'addMortalityForm',
        formHtml, listId: 'mortalityList', listTitle: 'Mortality History', loadListFunc: loadMortality
    });
    populateFlockDropdown('mortalityFlockId');
    document.getElementById('addMortalityForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this).entries());
        const result = await apiRequest('/mortality', 'POST', data);
        if (result.success) {
            showModal('Success', result.message);
            this.reset();
            document.getElementById('formContainer').style.display = 'none';
            loadMortality();
        }
    });
}

async function loadMortality() {
    const listDiv = document.getElementById('mortalityList');
    try {
        const mortality = await apiRequest('/mortality');
        if (mortality && mortality.length > 0) {
            listDiv.innerHTML = `
                <table class="min-w-full divide-y divide-gray-200 table-auto">
                    <thead class="bg-gray-50"><tr>
                        <th class="th-cell px-4 py-2">Date</th><th class="th-cell px-4 py-2">Flock</th><th class="th-cell px-4 py-2 text-right">Count</th><th class="th-cell px-4 py-2">Cause</th>
                    </tr></thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${mortality.map(m => `
                            <tr>
                                <td class="td-cell px-4 py-2">${new Date(m.date).toLocaleDateString()}</td>
                                <td class="td-cell px-4 py-2 font-medium">${m.flockName}</td>
                                <td class="td-cell px-4 py-2 text-right">${m.count}</td>
                                <td class="td-cell px-4 py-2">${m.cause || ''}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;
        } else {
            listDiv.innerHTML = '<p class="text-gray-500">No mortality records found.</p>';
        }
    } catch (error) {
        listDiv.innerHTML = '<p class="text-red-500">Error loading mortality records.</p>';
    }
}

function navigateTo(page) {
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    const renderer = pageRenderers[page];
    if (renderer) {
        renderer();
    } else {
        // Fallback for pages not yet implemented in this example
        pageContent.innerHTML = `<h2 class="text-3xl font-semibold text-gray-800">${page.charAt(0).toUpperCase() + page.slice(1)}</h2><p>This page is under construction.</p>`;
    }
}

const sidebar = document.getElementById('sidebar');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mainContent = document.getElementById('mainContent');

hamburgerBtn.addEventListener('click', () => {
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        mainContent.classList.add('md:ml-64');
    } else {
        sidebar.classList.add('-translate-x-full');
        mainContent.classList.remove('md:ml-64');
    }
});

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            navigateTo(link.dataset.page);
            // Close sidebar on mobile after navigation
            if (window.innerWidth < 768) {
                sidebar.classList.add('-translate-x-full');
                mainContent.classList.remove('md:ml-64');
            }
        });
    });
    navigateTo('dashboard'); // Load dashboard by default
});

