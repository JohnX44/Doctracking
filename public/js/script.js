// script.js

document.addEventListener('DOMContentLoaded', () => {
    const decorativeCircle = document.getElementById('decorativeCircle');

    document.addEventListener('mousemove', (event) => {
        // Calculate rotation based on mouse position
        const { clientX: mouseX, clientY: mouseY } = event;
        const { innerWidth: width, innerHeight: height } = window;

        // Calculate rotation degrees
        const rotateX = ((mouseY / height) - 0.5) * 30; // Rotate up to 15 degrees
        const rotateY = ((mouseX / width) - 0.5) * -30; // Rotate up to -15 degrees

        // Apply transformation to create 3D tilt effect
        decorativeCircle.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    // Reset the circle when the mouse leaves the window
    document.addEventListener('mouseleave', () => {
        decorativeCircle.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
});
