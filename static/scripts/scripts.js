// scripts.js (Add this to the existing file)

document.addEventListener('DOMContentLoaded', () => {
    // --- CATEGORY DROPDOWN LOGIC ---
    const categoryDropdownToggle = document.getElementById('category-dropdown-toggle');
    const categoryDropdownMenu = document.getElementById('category-dropdown-menu');
    const categoryDropdownArrow = document.getElementById('category-dropdown-arrow');

    if (categoryDropdownToggle && categoryDropdownMenu) {
        categoryDropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Toggles visibility (hidden class)
            categoryDropdownMenu.classList.toggle('hidden');
            
            // Toggles arrow rotation
            if (categoryDropdownArrow) {
                categoryDropdownArrow.classList.toggle('rotate-180');
            }
        });

        // Close dropdown if the user clicks anywhere else on the document
        document.addEventListener('click', (e) => {
            if (!categoryDropdownToggle.contains(e.target) && !categoryDropdownMenu.contains(e.target)) {
                categoryDropdownMenu.classList.add('hidden');
                if (categoryDropdownArrow) {
                     categoryDropdownArrow.classList.remove('rotate-180');
                }
            }
        });
    }
});