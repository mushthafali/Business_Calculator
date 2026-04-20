// Formatters
const fmtMoney = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDecimal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

function generateId() { return Math.random().toString(36).substr(2, 9); }

function formatCurrencyInput(el) {
    let val = el.value.replace(/[^0-9]/g, '');
    el.value = val ? parseInt(val, 10).toLocaleString('id-ID') : '';
}

// ============== CUSTOM MODAL LOGIC ==============
const modalOverlay = document.getElementById('custom-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalInput = document.getElementById('modal-input');
const modalConfirmBtn = document.getElementById('modal-confirm');
const modalCancelBtn = document.getElementById('modal-cancel');

function customPrompt(title, defaultText) {
    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMessage.style.display = 'none';
        modalInput.style.display = 'block';
        modalInput.value = defaultText || '';
        modalCancelBtn.style.display = 'block';
        modalConfirmBtn.textContent = 'Save';
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalInput.focus(), 10);

        modalInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                modalOverlay.style.display = 'none';
                resolve(modalInput.value);
            }
        };

        modalConfirmBtn.onclick = () => {
            modalOverlay.style.display = 'none';
            resolve(modalInput.value);
        };
        modalCancelBtn.onclick = () => {
            modalOverlay.style.display = 'none';
            resolve(null);
        };
    });
}

function customConfirm(title, message) {
    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalMessage.style.display = 'block';
        modalInput.style.display = 'none';
        modalCancelBtn.style.display = 'block';
        modalConfirmBtn.textContent = 'Yes';
        modalOverlay.style.display = 'flex';

        modalConfirmBtn.onclick = () => {
            modalOverlay.style.display = 'none';
            resolve(true);
        };
        modalCancelBtn.onclick = () => {
            modalOverlay.style.display = 'none';
            resolve(false);
        };
    });
}

function customAlert(title, message) {
    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalMessage.style.display = 'block';
        modalInput.style.display = 'none';
        modalCancelBtn.style.display = 'none';
        modalConfirmBtn.textContent = 'OK';
        modalOverlay.style.display = 'flex';

        modalConfirmBtn.onclick = () => {
            modalOverlay.style.display = 'none';
            resolve(true);
        };
    });
}

// ============== STATE MANAGEMENT ==============
let workspaces = JSON.parse(localStorage.getItem('hppWorkspaces')) || [];
let activeWorkspaceId = localStorage.getItem('hppActiveWorkspace') || null;

// Legacy Migration logic from Flat State:
let oldMasterItems = JSON.parse(localStorage.getItem('hppMaster'));
let oldProducts = JSON.parse(localStorage.getItem('hppProducts'));

if (workspaces.length === 0) {
    let ws = {
        id: generateId(),
        name: "Main Brand",
        masterItems: oldMasterItems || [],
        products: oldProducts || []
    };
    if (ws.products.length === 0) {
        ws.products.push({ id: generateId(), name: '', profitPct: '', opsPct: '', taxPct: '', recipeItems: [] });
    }
    workspaces.push(ws);
    activeWorkspaceId = ws.id;
    localStorage.removeItem('hppMaster');
    localStorage.removeItem('hppProducts');
    localStorage.setItem('hppWorkspaces', JSON.stringify(workspaces));
    localStorage.setItem('hppActiveWorkspace', activeWorkspaceId);
}

if (!activeWorkspaceId || !workspaces.find(w => w.id === activeWorkspaceId)) {
    activeWorkspaceId = workspaces[0].id;
}

// Active Pointers
let activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
let masterItems = activeWorkspace.masterItems;
let products = activeWorkspace.products;
let activeProductId = localStorage.getItem('hppActiveProduct_' + activeWorkspaceId) || null;

if (!activeProductId || !products.find(p => p.id === activeProductId)) {
    if (products.length > 0) activeProductId = products[0].id;
}

function saveState() {
    activeWorkspace.masterItems = masterItems;
    activeWorkspace.products = products;
    localStorage.setItem('hppWorkspaces', JSON.stringify(workspaces));
    localStorage.setItem('hppActiveWorkspace', activeWorkspaceId);
    if (activeProductId) {
        localStorage.setItem('hppActiveProduct_' + activeWorkspaceId, activeProductId);
    }
}

function getActiveProduct() {
    return products.find(p => p.id === activeProductId) || products[0];
}

function createBlankProduct() {
    const p = {
        id: generateId(),
        name: '',
        profitPct: '',
        opsPct: '',
        taxPct: '',
        recipeItems: []
    };
    products.push(p);
    activeProductId = p.id;
    saveState();
}

window.createNewProduct = function () {
    createBlankProduct();
    renderAll();
    setTimeout(() => { recipeNameInput.focus(); }, 100);
}

window.deleteCurrentProduct = async function () {
    if (products.length <= 1) {
        await customAlert("Warning", "Cannot delete the last calculator.");
        return;
    }
    const confirmed = await customConfirm("Delete Recipe", "Are you sure you want to delete this calculator forever?");
    if (confirmed) {
        products = products.filter(p => p.id !== activeProductId);
        activeProductId = products[0].id;
        saveState();
        renderAll();
    }
}

function switchProduct(id) {
    activeProductId = id;
    saveState();
    renderAll();
}

window.switchWorkspace = function (id) {
    activeWorkspaceId = id;
    activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    masterItems = activeWorkspace.masterItems;
    products = activeWorkspace.products;

    activeProductId = localStorage.getItem('hppActiveProduct_' + activeWorkspaceId) || null;
    if (!activeProductId || !products.find(p => p.id === activeProductId)) {
        if (products.length > 0) activeProductId = products[0].id;
    }

    saveState();
    renderAll();
};

window.createNewWorkspace = async function () {
    let name = await customPrompt("Enter New Brand Name:", "");
    if (!name || name.trim() === '') return;

    let w = {
        id: generateId(),
        name: name.trim(),
        masterItems: [],
        products: []
    };
    w.products.push({ id: generateId(), name: '', profitPct: '', opsPct: '', taxPct: '', recipeItems: [] });

    workspaces.push(w);
    switchWorkspace(w.id);
};

// Global Dropdown Handler
document.addEventListener('click', (e) => {
    const isTrigger = e.target.closest('.dropdown-trigger');
    if (!isTrigger) {
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    } else {
        const dropdown = isTrigger.closest('.custom-dropdown');
        document.querySelectorAll('.custom-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open');
    }
});

// ============== DOM ELEMENTS ==============
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const productSelector = document.getElementById('product-dropdown'); // using wrapper if needed
const productTrigger = document.getElementById('product-trigger');
const productMenu = document.getElementById('product-menu');
const workspaceTrigger = document.getElementById('workspace-trigger');
const workspaceMenu = document.getElementById('workspace-menu');
let editingMasterId = null;

// Tab Nav
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');

        // Hide Recipe Nav Actions when on Database tab
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            if (btn.dataset.tab === 'tab-master') {
                navActions.style.display = 'none';
            } else {
                navActions.style.display = 'flex';
            }
        }

        if (window.lucide) window.lucide.createIcons();
    });
});

// Master DOM
const masterTableBody = document.getElementById('master-body');
const masterForm = document.getElementById('master-form');
const masterEmpty = document.getElementById('master-empty');
const mHargaInput = document.getElementById('m-harga');

if (mHargaInput) {
    mHargaInput.addEventListener('input', function () { formatCurrencyInput(this); });
}

// Recipe DOM
const recipeBody = document.getElementById('recipe-body');
const recipeNameInput = document.getElementById('recipe-name');
const inputProfit = document.getElementById('calc-profit-pct');
const inputOps = document.getElementById('calc-ops-pct');
const inputTax = document.getElementById('calc-tax-pct');

// Summary DOM
const lblProfit = document.getElementById('lbl-profit');
const lblOps = document.getElementById('lbl-ops');
const lblTax = document.getElementById('lbl-tax');
const sumModal = document.getElementById('sum-modal');
const sumProfit = document.getElementById('sum-profit');
const sumOps = document.getElementById('sum-ops');
const sumTax = document.getElementById('sum-tax');
const sumGrand = document.getElementById('sum-grand');
const sumRecommendation = document.getElementById('sum-recommendation');

// Product Bindings
recipeNameInput.addEventListener('input', () => {
    let p = getActiveProduct();
    if (p) {
        p.name = recipeNameInput.value;
        saveState();
        if (productTrigger) {
            productTrigger.innerHTML = `${p.name || 'Untitled Recipe'} <i data-lucide="chevron-down"></i>`;
            if (window.lucide) window.lucide.createIcons();
        }
        renderProductSelector(); // To update the list text too
    }
});

[inputProfit, inputOps, inputTax].forEach((el, index) => {
    el.addEventListener('input', () => {
        let p = getActiveProduct();
        if (p) {
            if (index === 0) p.profitPct = el.value;
            if (index === 1) p.opsPct = el.value;
            if (index === 2) p.taxPct = el.value;
            saveState();
            calculateTotals();
        }
    });
});


// ============== MASTER LOGIC ==============

masterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = {
        id: generateId(),
        name: document.getElementById('m-name').value.trim(),
        price: parseFloat(document.getElementById('m-harga').value.replace(/\./g, '')) || 0,
        volume: parseFloat(document.getElementById('m-volume').value) || 1,
        unit: document.getElementById('m-unit').value.trim()
    };
    masterItems.push(item);
    masterForm.reset();
    saveState();
    renderAll();
});

window.editMasterRow = function (id) {
    editingMasterId = id;
    renderMaster();
}
window.cancelEditMaster = function () {
    editingMasterId = null;
    renderMaster();
}
window.saveInlineMaster = function (id) {
    const item = masterItems.find(x => x.id === id);
    if (!item) return;
    item.name = document.getElementById(`inline-name-${id}`).value.trim();
    item.price = parseFloat(document.getElementById(`inline-price-${id}`).value.replace(/\./g, '')) || 0;
    item.volume = parseFloat(document.getElementById(`inline-vol-${id}`).value) || 1;
    item.unit = document.getElementById(`inline-unit-${id}`).value.trim();

    editingMasterId = null;
    saveState();
    renderAll();
}
window.deleteMasterRow = async function (id) {
    const confirmed = await customConfirm("Delete Ingredient", "Are you sure you want to delete this ingredient from the database?");
    if (confirmed) {
        masterItems = masterItems.filter(item => item.id !== id);
        products.forEach(p => {
            p.recipeItems.forEach(ri => { if (ri.masterId === id) ri.masterId = ''; });
        });
        saveState();
        renderAll();
    }
}

function renderMaster() {
    masterTableBody.innerHTML = '';
    if (masterItems.length === 0) {
        masterEmpty.style.display = 'block';
    } else {
        masterEmpty.style.display = 'none';
        masterItems.forEach(item => {
            const tr = document.createElement('tr');
            if (editingMasterId === item.id) {
                tr.innerHTML = `
                    <td data-label="Name"><input type="text" id="inline-name-${item.id}" value="${item.name}" class="table-input" required></td>
                    <td data-label="Total Price" class="right"><input type="text" id="inline-price-${item.id}" value="${item.price.toLocaleString('id-ID')}" oninput="formatCurrencyInput(this)" class="table-input num" required></td>
                    <td data-label="Volume" class="right"><input type="number" id="inline-vol-${item.id}" value="${item.volume}" step="any" class="table-input num" required></td>
                    <td data-label="Unit"><input type="text" id="inline-unit-${item.id}" value="${item.unit}" class="table-input" required></td>
                    <td data-label="Cost / Unit" style="color:var(--fg-muted)">Auto</td>
                    <td data-label="Action" class="td-actions">
                        <button onclick="saveInlineMaster('${item.id}')" class="icon-btn"><i data-lucide="check"></i></button>
                        <button onclick="cancelEditMaster()" class="icon-btn"><i data-lucide="x"></i></button>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td data-label="Name">${item.name}</td>
                    <td data-label="Total Price" class="right">Rp ${fmtMoney.format(item.price)}</td>
                    <td data-label="Volume" class="right">${fmtDecimal.format(item.volume)}</td>
                    <td data-label="Unit">${item.unit}</td>
                    <td data-label="Cost / Unit">Rp ${fmtDecimal.format(item.price / item.volume)} / ${item.unit}</td>
                    <td data-label="Action" class="td-actions">
                        <button onclick="editMasterRow('${item.id}')" class="icon-btn" title="Edit"><i data-lucide="pencil"></i></button>
                        <button onclick="deleteMasterRow('${item.id}')" class="icon-btn danger-hover" title="Delete"><i data-lucide="trash-2"></i></button>
                    </td>
                `;
            }
            masterTableBody.appendChild(tr);
        });
    }
    if (window.lucide) window.lucide.createIcons();
}

// ============== RECIPE LOGIC ==============

window.addRecipeRow = function () {
    let p = getActiveProduct();
    if (p) {
        p.recipeItems.push({ id: generateId(), masterId: '', recipeVol: 0 });
        saveState();
        renderRecipeUI();
    }
}
window.updateRecipeRow = function (id, field, value) {
    let p = getActiveProduct();
    if (!p) return;
    const row = p.recipeItems.find(r => r.id === id);
    if (!row) return;

    if (field === 'masterId') {
        row.masterId = value;
        row.recipeVol = 1;
    } else if (field === 'recipeVol') {
        row.recipeVol = parseFloat(value) || 0;
    }

    saveState();
    renderRecipeUI();
}
window.deleteRecipeRow = function (id) {
    let p = getActiveProduct();
    if (!p) return;
    p.recipeItems = p.recipeItems.filter(r => r.id !== id);
    saveState();
    renderRecipeUI();
}
window.clearRecipe = async function () {
    const confirmed = await customConfirm("Clear Table", "Are you sure you want to clear all ingredients from this recipe?");
    if (confirmed) {
        let p = getActiveProduct();
        if (p) { p.recipeItems = []; saveState(); renderRecipeUI(); }
    }
}

window.exportDatabaseToExcel = function () {
    if (!window.XLSX) {
        alert("Excel Library not loaded yet. Please wait or check your internet connection.");
        return;
    }

    var wb = XLSX.utils.book_new();

    // 1. Database Sheet
    let masterData = [];
    masterData.push(["Name", "Total Price", "Volume", "Unit", "Cost / Unit"]);
    let masterRefObj = {};

    if (masterItems.length === 0) {
        masterData.push(["(No Ingredients)", 0, 0, "", 0]);
    } else {
        masterItems.forEach((m, idx) => {
            const rowNum = idx + 2;
            masterRefObj[m.id] = rowNum;
            const mPrice = parseFloat(m.price) || 0;
            const mVol = parseFloat(m.volume) || 0;
            const costPerUnit = mVol !== 0 ? mPrice / mVol : 0;

            masterData.push([
                m.name,
                { t: 'n', v: mPrice, z: '#,##0' },
                { t: 'n', v: mVol },
                m.unit,
                { t: 'n', v: costPerUnit, f: `B${rowNum}/C${rowNum}`, z: '#,##0' }
            ]);
        });
    }

    var wsMaster = XLSX.utils.aoa_to_sheet(masterData);
    wsMaster['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsMaster, "Database");

    // 2. Recipe Sheets
    activeWorkspace.products.forEach(p => {
        let recipeData = [];
        recipeData.push(["Bill of Materials - " + (p.name || 'Untitled')]);
        recipeData.push([]);
        recipeData.push(["Ingredient", "Master Vol", "Recipe Qty", "Unit", "Base Cost", "Total Cost"]);

        let startDataRow = 4;
        let endDataRow = startDataRow + p.recipeItems.length - 1;

        let totalBiaya = 0;

        if (p.recipeItems.length === 0) {
            recipeData.push(["(No Ingredients)", 0, 0, "", 0, 0]);
            endDataRow = startDataRow;
        } else {
            p.recipeItems.forEach((row, idx) => {
                let rIdx = 4 + idx;
                const master = masterItems.find(m => m.id === row.masterId);
                if (master) {
                    let masterDbRow = masterRefObj[master.id];
                    let baseCostFormulaRef = `Database!E${masterDbRow}`;

                    const mPrice = parseFloat(master.price) || 0;
                    const mVol = parseFloat(master.volume) || 0;
                    const rQty = parseFloat(row.recipeVol) || 0;
                    const baseCost = mVol !== 0 ? mPrice / mVol : 0;
                    const rowTotal = baseCost * rQty;
                    totalBiaya += rowTotal;

                    recipeData.push([
                        master.name,
                        { t: 'n', v: mVol },
                        { t: 'n', v: rQty },
                        master.unit,
                        { t: 'n', v: baseCost, f: baseCostFormulaRef, z: '#,##0' },
                        { t: 'n', v: rowTotal, f: `C${rIdx}*E${rIdx}`, z: '#,##0' }
                    ]);
                } else {
                    recipeData.push(["Unknown", 0, 0, "", 0, 0]);
                }
            });
        }

        recipeData.push([]);
        let baseCostRow = endDataRow + 2;

        recipeData.push([
            "Base Material Cost", "", "", "", "",
            { t: 'n', v: totalBiaya, f: `SUM(F${startDataRow}:F${endDataRow})`, z: '#,##0' }
        ]);

        let profitPctRow = baseCostRow + 1;
        let opsPctRow = profitPctRow + 1;
        let taxPctRow = opsPctRow + 1;

        const profitPct = parseFloat(p.profitPct) || 0;
        const opsPct = parseFloat(p.opsPct) || 0;
        const taxPct = parseFloat(p.taxPct) || 0;

        const profitVal = totalBiaya * (profitPct / 100);
        const opsVal = totalBiaya * (opsPct / 100);
        const taxVal = totalBiaya * (taxPct / 100);
        const grandTotal = totalBiaya + profitVal + opsVal + taxVal;

        recipeData.push([
            `Profit (${profitPct}%)`, "", "", "",
            { t: 'n', v: profitPct / 100, z: '0%' },
            { t: 'n', v: profitVal, f: `F${baseCostRow}*E${profitPctRow}`, z: '#,##0' }
        ]);

        recipeData.push([
            `Operations (${opsPct}%)`, "", "", "",
            { t: 'n', v: opsPct / 100, z: '0%' },
            { t: 'n', v: opsVal, f: `F${baseCostRow}*E${opsPctRow}`, z: '#,##0' }
        ]);

        recipeData.push([
            `Tax (${taxPct}%)`, "", "", "",
            { t: 'n', v: taxPct / 100, z: '0%' },
            { t: 'n', v: taxVal, f: `F${baseCostRow}*E${taxPctRow}`, z: '#,##0' }
        ]);

        recipeData.push([
            "Total Cost", "", "", "", "",
            { t: 'n', v: grandTotal, f: `F${baseCostRow}+F${profitPctRow}+F${opsPctRow}+F${taxPctRow}`, z: '#,##0' }
        ]);

        var wsRecipe = XLSX.utils.aoa_to_sheet(recipeData);
        wsRecipe['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 }];

        let sName = "Resep - " + (p.name || 'Untitled');
        sName = sName.replace(/[\\\/\?\*\[\]\:]/g, "").trim();
        if (sName.length > 31) sName = sName.substring(0, 31);

        let finalName = sName;
        let count = 1;
        while (wb.SheetNames.includes(finalName)) {
            let sFx = " " + count;
            finalName = sName.substring(0, 31 - sFx.length) + sFx;
            count++;
        }

        XLSX.utils.book_append_sheet(wb, wsRecipe, finalName);
    });

    let safeFilename = (activeWorkspace.name || "Brand").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(wb, `${safeFilename}_Export.xlsx`, { cellFormula: true });
}

window.promptEditWorkspaceName = async function () {
    let n = await customPrompt("New name for this database:", activeWorkspace.name);
    if (n && n.trim() !== '') { activeWorkspace.name = n.trim(); saveState(); renderWorkspaceSelector(); }
}

window.deleteCurrentWorkspace = async function () {
    if (workspaces.length <= 1) {
        await customAlert("Warning", "Cannot delete the last Brand.");
        return;
    }
    let confirmed = await customConfirm("Delete Brand", `Are you sure you want to delete Brand ${activeWorkspace.name} along with all ingredients & recipes permanently?`);
    if (confirmed) {
        workspaces = workspaces.filter(w => w.id !== activeWorkspaceId);
        switchWorkspace(workspaces[0].id);
    }
}

function renderWorkspaceSelector() {
    if (!workspaceMenu) return;
    workspaceMenu.innerHTML = '';

    if (workspaceTrigger) {
        workspaceTrigger.innerHTML = `${activeWorkspace.name} <i data-lucide="chevron-down" style="width:14px;height:14px;margin-left:4px;"></i>`;
    }

    workspaces.forEach(w => {
        const item = document.createElement('div');
        item.className = 'dropdown-item' + (w.id === activeWorkspaceId ? ' selected' : '');
        item.innerHTML = `<strong>${w.name}</strong>`;
        item.onclick = (e) => {
            if (e.target.closest('button')) return;
            switchWorkspace(w.id);
        };
        workspaceMenu.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();
}

function renderProductSelector() {
    if (!productMenu) return;
    productMenu.innerHTML = '';
    const activeP = getActiveProduct();
    if (productTrigger) {
        productTrigger.innerHTML = `${activeP ? activeP.name || 'Untitled Recipe' : 'Select Recipe'} <i data-lucide="chevron-down"></i>`;
    }

    products.forEach(p => {
        const item = document.createElement('div');
        item.className = 'dropdown-item' + (p.id === activeProductId ? ' selected' : '');
        item.textContent = p.name || 'Untitled Recipe';
        item.onclick = () => switchProduct(p.id);
        productMenu.appendChild(item);
    });
}

function renderRecipeUI() {
    let p = getActiveProduct();
    if (!p) return;

    recipeNameInput.value = p.name;
    inputProfit.value = p.profitPct;
    inputOps.value = p.opsPct;
    inputTax.value = p.taxPct;

    recipeBody.innerHTML = '';
    let totalBiaya = 0;

    p.recipeItems.forEach((row) => {
        const master = masterItems.find(m => m.id === row.masterId);
        let mVol = '', mUnit = '', mPrice = 0, rowTotal = 0;
        if (master) {
            mVol = master.volume;
            mUnit = master.unit;
            mPrice = master.price;
            rowTotal = (mPrice / mVol) * row.recipeVol;
            totalBiaya += rowTotal;
        }

        let optionItemsHTML = '';
        masterItems.forEach(m => {
            optionItemsHTML += `<div class="dropdown-item ${m.id === row.masterId ? 'selected' : ''}" onclick="updateRecipeRow('${row.id}', 'masterId', '${m.id}')">${m.name}</div>`;
        });

        const masterNameText = master ? master.name : 'Select';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Ingredient">
                <div class="custom-dropdown table-dropdown" style="min-width: 180px;">
                    <div class="dropdown-trigger">${masterNameText} <i data-lucide="chevron-down"></i></div>
                    <div class="dropdown-menu">${optionItemsHTML}</div>
                </div>
            </td>
            <td data-label="Master Vol" class="right" style="color:var(--fg-muted)">${master ? fmtDecimal.format(mVol) : '-'}</td>
            <td data-label="Recipe Qty">
                <input type="number" class="table-input num" onchange="updateRecipeRow('${row.id}', 'recipeVol', this.value)" 
                       value="${row.recipeVol}" step="any" min="0" ${!master ? 'disabled' : ''}>
            </td>
            <td data-label="Unit" style="color:var(--fg-muted)">${master ? mUnit : '-'}</td>
            <td data-label="Base Cost" class="right" style="color:var(--fg-muted)">${master ? 'Rp ' + fmtMoney.format(mPrice) : '-'}</td>
            <td data-label="Total" class="right"><strong>${master ? 'Rp ' + fmtMoney.format(rowTotal) : '-'}</strong></td>
            <td data-label="Action" class="td-actions">
                 <button onclick="deleteRecipeRow('${row.id}')" class="icon-btn danger-hover"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        recipeBody.appendChild(tr);
    });

    calculateTotals(totalBiaya);
    if (window.lucide) window.lucide.createIcons();
}

function calculateTotals(overrideTotalBiaya = null) {
    let p = getActiveProduct();
    if (!p) return;

    let tb = overrideTotalBiaya;
    if (tb === null) {
        tb = 0;
        p.recipeItems.forEach(row => {
            const m = masterItems.find(x => x.id === row.masterId);
            if (m) tb += (m.price / m.volume) * row.recipeVol;
        });
    }

    const profitPct = parseFloat(p.profitPct) || 0;
    const opsPct = parseFloat(p.opsPct) || 0;
    const taxPct = parseFloat(p.taxPct) || 0;

    const profitMarginValueCalculated = tb * (profitPct / 100);
    const profitRowValue = tb + profitMarginValueCalculated;
    const opsValue = profitRowValue * (opsPct / 100);
    const taxValue = profitRowValue * (taxPct / 100);
    const grandTotal = profitRowValue + opsValue + taxValue;
    const recommendation = Math.ceil(grandTotal / 1000) * 1000;

    lblProfit.textContent = profitPct;
    lblOps.textContent = opsPct;
    lblTax.textContent = taxPct;

    sumModal.textContent = 'Rp ' + fmtMoney.format(tb);
    sumProfit.textContent = 'Rp ' + fmtMoney.format(profitMarginValueCalculated);
    sumOps.textContent = 'Rp ' + fmtMoney.format(opsValue);
    sumTax.textContent = 'Rp ' + fmtMoney.format(taxValue);
    sumGrand.textContent = 'Rp ' + fmtMoney.format(grandTotal);
    sumRecommendation.textContent = 'Rp ' + fmtMoney.format(recommendation);
}

function renderAll() {
    renderWorkspaceSelector();
    renderMaster();
    renderProductSelector();
    renderRecipeUI();
}

// Initial render
renderAll();

// ============== EXCEL IMPORT LOGIC ==============
const excelUploadInput = document.getElementById('excel-upload');
if (excelUploadInput) {
    excelUploadInput.addEventListener('change', async function (e) {
        let file = e.target.files[0];
        if (!file) return;

        if (!window.XLSX) {
            customAlert("Error", "Excel Library not loaded yet. Please check your connection.");
            return;
        }

        const defaultBrandName = file.name.replace(/\.[^/.]+$/, "");
        let brandName = await customPrompt("Import as New Brand Name:", defaultBrandName);
        if (!brandName || brandName.trim() === '') {
            excelUploadInput.value = '';
            return;
        }

        let reader = new FileReader();
        reader.onload = function (e) {
            let data = new Uint8Array(e.target.result);
            let workbook;
            try {
                workbook = XLSX.read(data, { type: 'array' });
            } catch (err) {
                customAlert("Error", "Failed to read Excel file.");
                excelUploadInput.value = '';
                return;
            }

            if (!workbook.SheetNames.includes("Database")) {
                customAlert("Error", "Invalid file format. 'Database' sheet not found.");
                excelUploadInput.value = '';
                return;
            }

            let newWs = {
                id: generateId(),
                name: brandName.trim(),
                masterItems: [],
                products: []
            };

            let masterMap = {};

            // Parse Database
            let dbData = XLSX.utils.sheet_to_json(workbook.Sheets["Database"], { header: 1 });
            for (let i = 1; i < dbData.length; i++) {
                let row = dbData[i];
                if (!row || row.length === 0 || !row[0]) continue;
                if (row[0] === "(No Ingredients)") continue;

                let mItem = {
                    id: generateId(),
                    name: row[0].toString(),
                    price: parseFloat(row[1]) || 0,
                    volume: parseFloat(row[2]) || 0,
                    unit: row[3] ? row[3].toString() : ''
                };
                newWs.masterItems.push(mItem);
                masterMap[mItem.name] = mItem.id;
            }

            // Parse Recipes
            workbook.SheetNames.forEach(sheetName => {
                if (sheetName === "Database") return;

                let sData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
                if (sData.length < 3) return;

                let recipeName = sheetName.replace(/^Resep\s*-\s*/i, '').trim();

                let prod = {
                    id: generateId(),
                    name: recipeName,
                    profitPct: '',
                    opsPct: '',
                    taxPct: '',
                    recipeItems: []
                };

                let i = 3;
                while (i < sData.length) {
                    let rInfo = sData[i];
                    if (!rInfo || rInfo.length === 0 || typeof rInfo[0] !== 'string' || rInfo[0].startsWith("Base Material Cost") || rInfo[0] === "(No Ingredients)") {
                        break;
                    }

                    let ingName = rInfo[0];
                    let mId = masterMap[ingName];
                    let rQty = parseFloat(rInfo[2]) || 0;

                    if (mId) {
                        prod.recipeItems.push({
                            id: generateId(),
                            masterId: mId,
                            recipeVol: rQty
                        });
                    }
                    i++;
                }

                // Summary percentages
                for (let j = i; j < sData.length; j++) {
                    let rowStr = (sData[j] && sData[j][0]) ? sData[j][0].toString() : '';
                    if (rowStr.startsWith("Profit")) {
                        let match = rowStr.match(/\(([\d.]+)%\)/);
                        if (match) prod.profitPct = match[1];
                    }
                    if (rowStr.startsWith("Operations")) {
                        let match = rowStr.match(/\(([\d.]+)%\)/);
                        if (match) prod.opsPct = match[1];
                    }
                    if (rowStr.startsWith("Tax")) {
                        let match = rowStr.match(/\(([\d.]+)%\)/);
                        if (match) prod.taxPct = match[1];
                    }
                }

                newWs.products.push(prod);
            });

            if (newWs.products.length === 0) {
                newWs.products.push({ id: generateId(), name: '', profitPct: '', opsPct: '', taxPct: '', recipeItems: [] });
            }

            workspaces.push(newWs);
            excelUploadInput.value = '';

            switchWorkspace(newWs.id);
            setTimeout(() => { customAlert("Success", "Database imported successfully!"); }, 100);
        };
        reader.readAsArrayBuffer(file);
    });
}
