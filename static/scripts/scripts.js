document.addEventListener('DOMContentLoaded', () => {
    // CATEGORY DROPDOWN LOGIC
    const categoryDropdownToggle = document.getElementById('category-dropdown-toggle');
    const categoryDropdownMenu = document.getElementById('category-dropdown-menu');
    const categoryDropdownArrow = document.getElementById('category-dropdown-arrow');
    if (categoryDropdownToggle && categoryDropdownMenu) {
        categoryDropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();            
            categoryDropdownMenu.classList.toggle('hidden');            
            if (categoryDropdownArrow) {
                categoryDropdownArrow.classList.toggle('rotate-180');
            }
        });
        document.addEventListener('click', (e) => {
            if (!categoryDropdownToggle.contains(e.target) && !categoryDropdownMenu.contains(e.target)) {
                categoryDropdownMenu.classList.add('hidden');
                if (categoryDropdownArrow) {
                     categoryDropdownArrow.classList.remove('rotate-180');
                }
            }
        });
    }

    // CAROUSEL SCROLLING LOGIC
    const carousels = document.querySelectorAll('.grab-scroll-container');
    carousels.forEach(carousel => {
        let isDragging = false;
        let startX;
        let scrollLeft;
        let momentumID;
        let velocity = 0;
        let lastX;
        let lastTime;
        let lastScrollLeft;
        
        function handleDragStart(e) {
            // Stop any ongoing momentum scrolling
            if (momentumID) {
                cancelAnimationFrame(momentumID);
                momentumID = null;
            }
            isDragging = true;
            carousel.classList.add('active-grab');
            startX = getPositionX(e);
            lastX = startX;
            lastTime = Date.now();
            scrollLeft = carousel.scrollLeft;
            lastScrollLeft = scrollLeft;
            velocity = 0;
            e.preventDefault();
            e.stopPropagation();
        }

        function handleDragMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            // Get current position and time
            const currentX = getPositionX(e);
            const currentTime = Date.now();
            const dx = currentX - lastX;
            const dt = currentTime - lastTime;
            // Update scroll position
            const newScrollLeft = scrollLeft - (currentX - startX);
            carousel.scrollLeft = newScrollLeft;
            // Calculate velocity (pixels per millisecond)
            if (dt > 0) {
                velocity = dx / dt; // Changed to use the mouse movement direction
                lastScrollLeft = newScrollLeft;
            }
            lastX = currentX;
            lastTime = currentTime;
        }

        function handleDragEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            carousel.classList.remove('active-grab');
            // Apply momentum if there's significant velocity
            if (Math.abs(velocity) > 0.1) {
                applyMomentum();
            }
        }

        function applyMomentum() {
            const deceleration = 0.95; // Adjust this value to change how quickly the momentum dies off
            const minVelocity = 0.01;
            function momentumScroll() {
                if (Math.abs(velocity) < minVelocity) {
                    velocity = 0;
                    return;
                }
                carousel.scrollLeft -= velocity * 16; 
                velocity *= deceleration;
                momentumID = requestAnimationFrame(momentumScroll);
            }
            momentumID = requestAnimationFrame(momentumScroll);
        }

        function getPositionX(e) {
            if (e.type.includes('mouse')) {
                return e.pageX;
            }
            if (e.touches && e.touches[0]) {
                return e.touches[0].pageX;
            }
            return 0;
        }

        // Mouse events
        carousel.addEventListener('mousedown', handleDragStart, { passive: false });
        carousel.addEventListener('mousemove', handleDragMove, { passive: false });
        carousel.addEventListener('mouseup', handleDragEnd);
        carousel.addEventListener('mouseleave', handleDragEnd);

        // Touch events
        carousel.addEventListener('touchstart', handleDragStart, { passive: false });
        carousel.addEventListener('touchmove', handleDragMove, { passive: false });
        carousel.addEventListener('touchend', handleDragEnd);
        carousel.addEventListener('touchcancel', handleDragEnd);

        // Prevent context menu on right click
        carousel.addEventListener('contextmenu', e => e.preventDefault());

        // Prevent click events during drag
        carousel.addEventListener('click', (e) => {
            if (Math.abs(velocity) > 0.1) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    });
});
