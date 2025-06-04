// ==UserScript==
// @name         Video Skip with Arrow Keys for Microsoft Stream/SharePoint
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Allows skipping backward/forward using left/right arrow keys in Microsoft Stream/SharePoint videos
// @author       kazcfz
// @match        https://*.sharepoint.com/*
// @icon         https://res-1.cdn.office.net/shellux/stream_24x.12dba766a9c30382b781c971070dc87c.svg
// @grant        none
// @license      MIT
// ==/UserScript==
 
(function () {
    'use strict';
 
    const secondsToSkip = 5;
 
    const videoRoot = document.querySelector('.oneplayer-root');
    if (!videoRoot) {
        console.warn('.oneplayer-root container not found.');
        return;
    }
 
    // Overlay to indicate video skip
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '50%';
    overlay.style.transform = 'translateY(-50%)';
    overlay.style.padding = '15px 15px';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.borderRadius = '50%';
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.1s ease';
    overlay.style.zIndex = '9999';
    overlay.style.userSelect = 'none';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.gap = '0.2em';
    overlay.style.minWidth = '75px';
    overlay.style.minHeight = '75px';
    overlay.style.textAlign = 'center';
    if (getComputedStyle(videoRoot).position === 'static') videoRoot.style.position = 'relative';
    videoRoot.appendChild(overlay);
 
    // Overlay container for left/right triangles
    const trianglesContainer = document.createElement('div');
    trianglesContainer.style.display = 'flex';
    trianglesContainer.style.gap = '10px';
    overlay.appendChild(trianglesContainer);
 
    // Add triangles into its container
    const triangles = [];
    for (let i = 0; i < 3; i++) {
        const tri = document.createElement('span');
        tri.textContent = '▶';
        tri.style.fontSize = '13px';
        tri.style.fontWeight = 'bold';
        trianglesContainer.appendChild(tri);
        triangles.push(tri);
    }
 
    // Overlay text for seconds skipped
    const secondsText = document.createElement('div');
    secondsText.style.fontSize = '14px';
    secondsText.style.fontWeight = 'normal';
    secondsText.style.color = 'rgba(255,255,255,0.85)';
    secondsText.style.userSelect = 'none';
    overlay.appendChild(secondsText);
 
    let hideTimeout;
    let animTimeouts = [];
 
    // Clear animation timers
    function clearAnimation() {
        animTimeouts.forEach(t => clearTimeout(t));
        animTimeouts = [];
    }
 
    // Displays overlay triangle animation and seconds skipped
    function showAnimatedTriangles(side) {
        clearTimeout(hideTimeout);
        clearAnimation();
 
        const isLeft = side === 'left';
        const char = isLeft ? '◀' : '▶';
        const order = isLeft ? [2, 1, 0] : [0, 1, 2];
 
        triangles.forEach(t => {
            t.textContent = char;
            t.style.transition = 'none';
            t.style.color = 'rgba(255,255,255,0.3)';
        });
 
        // Force style flush to apply the color immediately before re-enabling transitions
        void overlay.offsetHeight;
        triangles.forEach(t => { t.style.transition = 'color 0.25s ease'; });
 
        secondsText.textContent = `${secondsToSkip} seconds`;
 
        overlay.style.opacity = '1';
        overlay.style.left = isLeft ? '10%' : 'auto';
        overlay.style.right = isLeft ? 'auto' : '10%';
        overlay.style.textAlign = 'center';
 
        triangles[order[0]].style.color = 'rgba(255,255,255,0.75)';
 
        const interval = 250;
 
        for (let step = 2; step <= 3; step++) {
            animTimeouts.push(setTimeout(() => {
                if (step === 2) {
                    triangles[order[0]].style.color = 'rgba(255,255,255,0.5)';
                    triangles[order[1]].style.color = 'rgba(255,255,255,0.75)';
                }
                else if (step === 3) {
                    triangles[order[0]].style.color = 'rgba(255,255,255,0.3)';
                    triangles[order[1]].style.color = 'rgba(255,255,255,0.5)';
                    triangles[order[2]].style.color = 'rgba(255,255,255,0.75)';
                }
            }, (step - 1) * interval));
        }
 
        hideTimeout = setTimeout(() => {
            overlay.style.opacity = '0';
        }, 3.2 * interval);
    }
 
    // Checks that the video player is focused
    function isInOnePlayerRoot(element) {
        while (element) {
            if (element === videoRoot) return true;
            element = element.parentElement;
        }
        return false;
    }
 
    // Find the <video> element inside .oneplayer-root container
    function findVideo(element) {
        return videoRoot.querySelector('video');
    }
 
    document.addEventListener('keydown', function (e) {
        if (!isInOnePlayerRoot(e.target)) return;
 
        const video = findVideo(e.target);
        if (!video) return;
 
        // Ignore combo keys
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
 
        // Use left/right arrow keys to skip backward/forward
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            video.currentTime = Math.max(0, video.currentTime - secondsToSkip);
            showAnimatedTriangles('left');
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            video.currentTime = Math.min(video.duration, video.currentTime + secondsToSkip);
            showAnimatedTriangles('right');
        }
    });
})();