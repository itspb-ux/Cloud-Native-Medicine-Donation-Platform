// Chart instances
window.inventoryChart = null;
window.donationChart = null;

// Helpers for Auth and API Requests
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

// Global Actions (Exposed to window for HTML inline event handlers)
window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert("Logged out successfully!");
    window.location.href = "login.html";
};

// Check authentication and roles on page load
function checkAuth() {
    const user = getUser();
    const token = getToken();
    const path = window.location.pathname;

    updateNavbar();

    // Check if the current page is one of the protected pages
    const isProtectedPage = 
        path.includes('pharmacy-dashboard.html') ||
        path.includes('ngo-dashboard.html') ||
        path.includes('admin-dashboard.html') ||
        path.includes('profile.html') ||
        path.includes('reports.html');

    if (isProtectedPage) {
        if (!token || !user) {
            window.location.href = 'login.html';
            return;
        }

        // Verify JWT token is still valid with backend
        fetch('/api/auth/me', { headers: getHeaders() })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Invalid token");
                }
                return res.json();
            })
            .then(userData => {
                // Update local storage user data to ensure it's fresh
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Role verification
                if (path.includes('pharmacy-dashboard.html') && userData.role !== 'Pharmacy') {
                    redirectBasedOnRole(userData.role);
                } else if (path.includes('ngo-dashboard.html') && userData.role !== 'NGO') {
                    redirectBasedOnRole(userData.role);
                } else if (path.includes('admin-dashboard.html') && userData.role !== 'Admin') {
                    redirectBasedOnRole(userData.role);
                }
            })
            .catch(err => {
                console.error("Auth verification failed:", err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            });
    } else if (path.includes('login.html') || path.includes('register.html')) {
        // If already logged in, redirect to correct dashboard
        if (token && user) {
            redirectBasedOnRole(user.role);
        }
    }
}

function redirectBasedOnRole(role) {
    if (role === 'Pharmacy') {
        window.location.href = 'pharmacy-dashboard.html';
    } else if (role === 'NGO') {
        window.location.href = 'ngo-dashboard.html';
    } else if (role === 'Admin') {
        window.location.href = 'admin-dashboard.html';
    } else {
        window.location.href = 'index.html';
    }
}

// Dynamically updates navigation based on login state
function updateNavbar() {
    const navUl = document.querySelector('nav ul');
    if (!navUl) return;

    const user = getUser();
    const token = getToken();

    if (token && user) {
        let dashboardLink = '';
        if (user.role === 'Pharmacy') dashboardLink = 'pharmacy-dashboard.html';
        else if (user.role === 'NGO') dashboardLink = 'ngo-dashboard.html';
        else if (user.role === 'Admin') dashboardLink = 'admin-dashboard.html';

        navUl.innerHTML = `
            <li><a href="index.html">Home</a></li>
            <li><a href="${dashboardLink}">Dashboard</a></li>
            <li><a href="profile.html">Profile</a></li>
            <li><a href="reports.html">Reports</a></li>
            <li><a href="#" id="logoutLink">Logout</a></li>
        `;
        document.getElementById('logoutLink').addEventListener('click', function(e) {
            e.preventDefault();
            window.logout();
        });
    } else {
        navUl.innerHTML = `
            <li><a href="index.html">Home</a></li>
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Register</a></li>
        `;
    }
}

// ==========================================
// FORMS HANDLERS
// ==========================================

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.error || 'Login failed') });
            }
            return res.json();
        })
        .then(data => {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            redirectBasedOnRole(data.user.role);
        })
        .catch(err => {
            alert(err.message);
        });
    });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", function(event) {
        event.preventDefault();
        const name = document.getElementById("name").value;
        const email = document.getElementById("regEmail").value;
        const role = document.getElementById("role").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, role, password })
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.error || 'Registration failed') });
            }
            return res.json();
        })
        .then(data => {
            alert(data.message);
            window.location.href = "login.html";
        })
        .catch(err => {
            alert(err.message);
        });
    });
}

// ==========================================
// CHARTS RENDER FUNCTIONS
// ==========================================

function renderPharmacyInventoryChart(stats) {
    const canvas = document.getElementById('pharmacyInventoryChart');
    if (!canvas) return;

    if (window.inventoryChart) {
        window.inventoryChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    window.inventoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Available', 'Near Expiry', 'Donated', 'Pending Donation'],
            datasets: [{
                data: [
                    Math.max(0, stats.pharmacyMedsCount - stats.pharmacyNearExpiryCount - stats.pharmacyDonatedCount - stats.pharmacyPendingDonatedCount),
                    stats.pharmacyNearExpiryCount,
                    stats.pharmacyDonatedCount,
                    stats.pharmacyPendingDonatedCount
                ],
                backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Poppins', size: 12 }
                    }
                }
            }
        }
    });
}

function renderReportsChart(donations) {
    const canvas = document.getElementById('reportsDonationChart');
    if (!canvas) return;

    if (window.donationChart) {
        window.donationChart.destroy();
    }

    // Group completed donations by NGO
    const groups = {};
    donations.forEach(d => {
        if (d.status === 'Delivered' || d.status === 'Accepted') {
            groups[d.ngoName] = (groups[d.ngoName] || 0) + d.quantity;
        }
    });

    const labels = Object.keys(groups);
    const data = Object.values(groups);

    const ctx = canvas.getContext('2d');
    window.donationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Medicines Saved (Quantity)',
                data: data,
                backgroundColor: '#2563EB',
                borderRadius: 8,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { font: { family: 'Poppins' } }
                },
                x: {
                    ticks: { font: { family: 'Poppins' } }
                }
            }
        }
    });
}

// ==========================================
// PHARMACY DASHBOARD
// ==========================================

function loadPharmacyDashboard() {
    const welcomeHeader = document.getElementById('welcomeHeader');
    const user = getUser();
    if (welcomeHeader && user) {
        welcomeHeader.textContent = `Welcome ${user.name} 👨‍⚕️`;
    }

    // Load Stats & Render Chart
    fetch('/api/reports/stats', { headers: getHeaders() })
        .then(res => res.json())
        .then(stats => {
            document.getElementById('statTotalMedicines').textContent = stats.pharmacyMedsCount;
            document.getElementById('statNearExpiry').textContent = stats.pharmacyNearExpiryCount;
            document.getElementById('statDonated').textContent = stats.pharmacyDonatedCount;
            document.getElementById('statPendingDonations').textContent = stats.pharmacyPendingDonatedCount;
            
            renderPharmacyInventoryChart(stats);
        })
        .catch(err => console.error("Error fetching stats:", err));

    // Load Inventory Table
    const tbody = document.getElementById('inventoryTableBody');
    if (tbody) {
        fetch('/api/medicines', { headers: getHeaders() })
            .then(res => res.json())
            .then(medicines => {
                tbody.innerHTML = '';
                if (medicines.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No medicines in inventory. Add some below!</td></tr>`;
                    return;
                }
                medicines.forEach(med => {
                    const tr = document.createElement('tr');
                    
                    let actionBtn = '';
                    if (med.status === 'Available' || med.status === 'Near Expiry') {
                        actionBtn = `<button onclick="donateMedicine('${med.id}')" style="background-color: #2563EB; margin-right: 5px;">Donate</button>`;
                    } else {
                        actionBtn = `<span style="font-weight: 500; color: #555;">${med.status}</span>`;
                    }

                    actionBtn += `<button onclick="deleteMedicine('${med.id}')" style="background-color: #dc3545;">Delete</button>`;

                    tr.innerHTML = `
                        <td>${med.name}</td>
                        <td>${med.quantity}</td>
                        <td>${formatDate(med.expiryDate)}</td>
                        <td><span class="status-badge status-${med.status.toLowerCase().replace(' ', '-')}">${med.status}</span></td>
                        <td>${actionBtn}</td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error("Error loading inventory:", err));
    }

    // Load Open NGO Wishlist Requests
    const wishlistTbody = document.getElementById('pharmacyWishlistTableBody');
    if (wishlistTbody) {
        fetch('/api/wishlist', { headers: getHeaders() })
            .then(res => res.json())
            .then(items => {
                wishlistTbody.innerHTML = '';
                const openItems = items.filter(i => i.status === 'Open');
                if (openItems.length === 0) {
                    wishlistTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No open NGO requests at the moment.</td></tr>`;
                    return;
                }
                openItems.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.ngoName}</td>
                        <td>${item.medicineName}</td>
                        <td>${item.quantity}</td>
                        <td><button onclick="fulfillWishlist('${item.id}')" style="background-color: #16A34A;">Fulfill</button></td>
                    `;
                    wishlistTbody.appendChild(tr);
                });
            })
            .catch(err => console.error("Error loading wishlist:", err));
    }
}

// Action: Donate Medicine
window.donateMedicine = function(medicineId) {
    fetch(`/api/medicines/${medicineId}/donate`, {
        method: 'POST',
        headers: getHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to mark medicine for donation.");
        return res.json();
    })
    .then(data => {
        alert("Medicine marked for donation successfully!");
        loadPharmacyDashboard();
    })
    .catch(err => alert(err.message));
};

// Action: Delete Medicine
window.deleteMedicine = function(medicineId) {
    if (!confirm("Are you sure you want to delete this medicine?")) return;

    fetch(`/api/medicines/${medicineId}`, {
        method: 'DELETE',
        headers: getHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to delete medicine.");
        return res.json();
    })
    .then(data => {
        alert("Medicine deleted successfully!");
        loadPharmacyDashboard();
    })
    .catch(err => alert(err.message));
};

// Action: Fulfill NGO Wishlist
window.fulfillWishlist = function(wishlistId) {
    if (!confirm("Fulfill this NGO request? This will record a completed medicine donation.")) return;

    fetch(`/api/wishlist/${wishlistId}/fulfill`, {
        method: 'POST',
        headers: getHeaders()
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || 'Failed to fulfill request') });
        }
        return res.json();
    })
    .then(data => {
        alert("Request fulfilled successfully!");
        loadPharmacyDashboard();
    })
    .catch(err => alert(err.message));
};

// Form: Add Medicine
const addMedicineForm = document.getElementById('addMedicineForm');
if (addMedicineForm) {
    addMedicineForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('medName').value;
        const quantity = document.getElementById('medQty').value;
        const expiryDate = document.getElementById('medExpiry').value;

        fetch('/api/medicines', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, quantity, expiryDate })
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to add medicine.");
            return res.json();
        })
        .then(data => {
            alert("Medicine added successfully!");
            addMedicineForm.reset();
            loadPharmacyDashboard();
        })
        .catch(err => alert(err.message));
    });
}

// ==========================================
// NGO DASHBOARD
// ==========================================

function loadNgoDashboard() {
    const welcomeHeader = document.getElementById('welcomeHeader');
    const user = getUser();
    if (welcomeHeader && user) {
        welcomeHeader.textContent = `Welcome ${user.name} 👋`;
    }

    // Load Stats
    fetch('/api/reports/stats', { headers: getHeaders() })
        .then(res => res.json())
        .then(stats => {
            document.getElementById('statAvailableMedicines').textContent = stats.ngoAvailableMedsCount;
            document.getElementById('statPendingRequests').textContent = stats.ngoPendingCount;
            document.getElementById('statAcceptedDonations').textContent = stats.ngoAcceptedCount;
            document.getElementById('statRejectedRequests').textContent = stats.ngoRejectedCount;
        })
        .catch(err => console.error("Error fetching stats:", err));

    // Load Available Medicines Table
    const tbody = document.getElementById('ngoMedicinesTableBody');
    if (tbody) {
        fetch('/api/medicines', { headers: getHeaders() })
            .then(res => res.json())
            .then(medicines => {
                tbody.innerHTML = '';
                if (medicines.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No medicines currently available for donation. Check back later!</td></tr>`;
                    return;
                }
                medicines.forEach(med => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${med.name}</td>
                        <td>${med.quantity}</td>
                        <td>${formatDate(med.expiryDate)}</td>
                        <td>${med.pharmacyName}</td>
                        <td>
                            <button onclick="acceptDonation('${med.id}')" style="background-color: #16A34A;">Accept</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error("Error loading medicines:", err));
    }

    // Load My Requested Wishlist items
    const wishlistTbody = document.getElementById('ngoWishlistTableBody');
    if (wishlistTbody) {
        fetch('/api/wishlist', { headers: getHeaders() })
            .then(res => res.json())
            .then(items => {
                wishlistTbody.innerHTML = '';
                const myItems = items.filter(i => i.ngoId === user.id);
                if (myItems.length === 0) {
                    wishlistTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">You have not made any requests yet.</td></tr>`;
                    return;
                }
                myItems.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.medicineName}</td>
                        <td>${item.quantity}</td>
                        <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
                        <td>${item.pharmacyName || 'Awaiting fulfillment'}</td>
                    `;
                    wishlistTbody.appendChild(tr);
                });
            })
            .catch(err => console.error("Error loading my wishlist:", err));
    }
}

// Action: NGO Accept Donation
window.acceptDonation = function(medicineId) {
    fetch('/api/donations', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ medicineId })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || 'Failed to accept donation') });
        }
        return res.json();
    })
    .then(data => {
        alert("Donation request accepted successfully!");
        loadNgoDashboard();
    })
    .catch(err => alert(err.message));
};

// Form: Submit Wishlist Request
const requestWishlistForm = document.getElementById('requestWishlistForm');
if (requestWishlistForm) {
    requestWishlistForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const medicineName = document.getElementById('wishName').value;
        const quantity = document.getElementById('wishQty').value;

        fetch('/api/wishlist', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ medicineName, quantity })
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to submit request.");
            return res.json();
        })
        .then(data => {
            alert("Medicine request submitted to wishlist!");
            requestWishlistForm.reset();
            loadNgoDashboard();
        })
        .catch(err => alert(err.message));
    });
}

// ==========================================
// ADMIN DASHBOARD
// ==========================================

function loadAdminDashboard() {
    // Stats
    fetch('/api/reports/stats', { headers: getHeaders() })
        .then(res => res.json())
        .then(stats => {
            document.getElementById('statTotalPharmacies').textContent = stats.totalPharmacies;
            document.getElementById('statTotalNgos').textContent = stats.totalNgos;
            document.getElementById('statTotalDonations').textContent = stats.totalDonations;
            document.getElementById('statPendingApprovals').textContent = stats.pendingApprovalsCount;
        })
        .catch(err => console.error("Error fetching admin stats:", err));

    // Users table
    const tbody = document.getElementById('adminUsersTableBody');
    if (tbody) {
        fetch('/api/admin/users', { headers: getHeaders() })
            .then(res => res.json())
            .then(users => {
                tbody.innerHTML = '';
                
                // Filter out admin themselves
                const clientUsers = users.filter(u => u.role !== 'Admin');
                
                if (clientUsers.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No users registered yet.</td></tr>`;
                    return;
                }

                clientUsers.forEach(user => {
                    const tr = document.createElement('tr');
                    
                    let actionBtn = '';
                    if (user.status === 'Pending') {
                        actionBtn = `
                            <button onclick="approveUser('${user.id}')" style="background-color: #16A34A; margin-right: 5px;">Approve</button>
                            <button onclick="deleteUser('${user.id}')" style="background-color: #dc3545;">Reject</button>
                        `;
                    } else {
                        actionBtn = `
                            <span style="color: #16A34A; font-weight: bold; margin-right: 10px;">Approved</span>
                            <button onclick="deleteUser('${user.id}')" style="background-color: #dc3545;">Delete</button>
                        `;
                    }

                    tr.innerHTML = `
                        <td>${user.name}</td>
                        <td>${user.role}</td>
                        <td><span class="status-badge status-${user.status.toLowerCase()}">${user.status}</span></td>
                        <td>${actionBtn}</td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error("Error loading users:", err));
    }

    // Expiry Alerts Table
    const alertsTbody = document.getElementById('adminAlertsTableBody');
    if (alertsTbody) {
        fetch('/api/admin/alerts', { headers: getHeaders() })
            .then(res => res.json())
            .then(alerts => {
                alertsTbody.innerHTML = '';
                if (alerts.length === 0) {
                    alertsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No automated expiry alerts logged.</td></tr>`;
                    return;
                }
                alerts.forEach(alert => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${alert.recipientName}</strong><br><small>${alert.recipientEmail}</small></td>
                        <td>${alert.medicineName}</td>
                        <td>${formatDate(alert.expiryDate)}</td>
                        <td style="text-align:left; font-size:13px;"><strong>${alert.subject}</strong><br><span style="color:#555;">${alert.body.substring(0, 100)}...</span></td>
                        <td>${formatDate(alert.sentDate)}</td>
                    `;
                    alertsTbody.appendChild(tr);
                });
            })
            .catch(err => console.error("Error loading alerts:", err));
    }
}

// Action: Approve User
window.approveUser = function(userId) {
    fetch(`/api/admin/users/${userId}/approve`, {
        method: 'PUT',
        headers: getHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to approve user.");
        return res.json();
    })
    .then(data => {
        alert("User approved successfully!");
        loadAdminDashboard();
    })
    .catch(err => alert(err.message));
};

// Action: Delete/Reject User
window.deleteUser = function(userId) {
    if (!confirm("Are you sure you want to remove this user?")) return;

    fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to remove user.");
        return res.json();
    })
    .then(data => {
        alert("User removed/rejected successfully!");
        loadAdminDashboard();
    })
    .catch(err => alert(err.message));
};

// ==========================================
// PROFILE PAGE
// ==========================================

function loadProfile() {
    fetch('/api/auth/me', { headers: getHeaders() })
        .then(res => res.json())
        .then(user => {
            document.getElementById('profileName').textContent = user.name;
            document.getElementById('profileEmail').textContent = user.email;
            document.getElementById('profilePhone').textContent = user.phone || 'Not provided';
            document.getElementById('profileAddress').textContent = user.address || 'Not provided';
            document.getElementById('profileRole').textContent = user.role;

            // Prefill edit inputs
            document.getElementById('editName').value = user.name;
            document.getElementById('editPhone').value = user.phone || '';
            document.getElementById('editAddress').value = user.address || '';
        })
        .catch(err => console.error("Error loading profile:", err));
}

window.showEditForm = function() {
    document.getElementById('profileViewCard').style.display = 'none';
    document.getElementById('profileEditCard').style.display = 'block';
};

window.hideEditForm = function() {
    document.getElementById('profileViewCard').style.display = 'block';
    document.getElementById('profileEditCard').style.display = 'none';
};

const editProfileForm = document.getElementById('editProfileForm');
if (editProfileForm) {
    editProfileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('editName').value;
        const phone = document.getElementById('editPhone').value;
        const address = document.getElementById('editAddress').value;

        fetch('/api/auth/profile', {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name, phone, address })
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to update profile.");
            return res.json();
        })
        .then(data => {
            alert("Profile updated successfully!");
            window.hideEditForm();
            loadProfile();
        })
        .catch(err => alert(err.message));
    });
}

// ==========================================
// REPORTS PAGE
// ==========================================

function loadReports() {
    // Stats
    fetch('/api/reports/stats', { headers: getHeaders() })
        .then(res => res.json())
        .then(stats => {
            document.getElementById('statTotalDonations').textContent = stats.completedDonationsCount;
            document.getElementById('statMedicinesSaved').textContent = stats.medicinesSaved;
            document.getElementById('statNgosServed').textContent = stats.ngosServedCount;
            document.getElementById('statActivePharmacies').textContent = stats.activePharmaciesCount;
        })
        .catch(err => console.error("Error fetching reports stats:", err));

    // Donation history table & Chart
    const tbody = document.getElementById('reportsTableBody');
    if (tbody) {
        fetch('/api/donations', { headers: getHeaders() })
            .then(res => res.json())
            .then(donations => {
                tbody.innerHTML = '';
                if (donations.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No donation records found.</td></tr>`;
                    return;
                }
                donations.forEach(donation => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${formatDate(donation.date)}</td>
                        <td>${donation.medicineName}</td>
                        <td>${donation.quantity}</td>
                        <td>${donation.ngoName}</td>
                        <td><span class="status-badge status-${donation.status.toLowerCase()}">${donation.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                });

                renderReportsChart(donations);
            })
            .catch(err => console.error("Error loading donations:", err));
    }
}

window.downloadReport = function() {
    fetch('/api/donations', { headers: getHeaders() })
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch donation history.");
            return res.json();
        })
        .then(donations => {
            if (donations.length === 0) {
                alert("No donation data available to download.");
                return;
            }
            
            let csv = 'Date,Medicine,Quantity,NGO,Pharmacy,Status\n';
            donations.forEach(d => {
                csv += `"${formatDate(d.date)}","${d.medicineName}",${d.quantity},"${d.ngoName}","${d.pharmacyName}","${d.status}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `medicine_donation_report_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert("Report downloaded successfully!");
        })
        .catch(err => alert(err.message));
};

// ==========================================
// UTILITY HELPERS
// ==========================================

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
}

// ==========================================
// INITIALIZATION ON PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", function() {
    // 1. Run auth check for redirect logic
    checkAuth();

    // 2. Load page specific data
    const path = window.location.pathname;
    if (path.includes('pharmacy-dashboard.html')) {
        loadPharmacyDashboard();
    } else if (path.includes('ngo-dashboard.html')) {
        loadNgoDashboard();
    } else if (path.includes('admin-dashboard.html')) {
        loadAdminDashboard();
    } else if (path.includes('profile.html')) {
        loadProfile();
    } else if (path.includes('reports.html')) {
        loadReports();
    }
});