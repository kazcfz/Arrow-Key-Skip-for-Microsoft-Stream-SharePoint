// ==UserScript==
// @name         Better Keyboard Shortcuts for Microsoft Stream/SharePoint
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Simpler keyboard shorcuts with visual indicators for Microsoft Stream/SharePoint videos
// @author       kazcfz
// @include      https://*.sharepoint.com/*
// @icon         https://res-1.cdn.office.net/shellux/stream_24x.12dba766a9c30382b781c971070dc87c.svg
// @grant        none
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/538268/Better%20Keyboard%20Shortcuts%20for%20Microsoft%20StreamSharePoint.user.js
// @updateURL https://update.greasyfork.org/scripts/538268/Better%20Keyboard%20Shortcuts%20for%20Microsoft%20StreamSharePoint.meta.js
// ==/UserScript==

/* eslint curly: "off" */

(function () {
    'use strict';

    // Wait until .oneplayer-root exists in the DOM, then run callback with it
    function waitForOnePlayerRoot(callback) {
        const root = document.querySelector('.oneplayer-root') || document.querySelector('.OnePlayer-container');
        if (root) {
            callback(root);
            return;
        }
        const docObserver = new MutationObserver((mutations, obs) => {
            const el = document.querySelector('.oneplayer-root') || document.querySelector('.OnePlayer-container');
            if (el) {
                obs.disconnect();
                callback(el);
            }
        });
        docObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    waitForOnePlayerRoot(videoRoot => {
        if (getComputedStyle(videoRoot).position === 'static')
            videoRoot.style.position = 'relative';

        // Overlay to indicate Skip
        const skipOverlay = document.createElement('div');
        skipOverlay.style.position = 'absolute';
        skipOverlay.style.top = '50%';
        skipOverlay.style.transform = 'translateY(-50%)';
        skipOverlay.style.padding = '15px 15px';
        skipOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        skipOverlay.style.borderRadius = '50%';
        skipOverlay.style.pointerEvents = 'none';
        skipOverlay.style.opacity = '0';
        skipOverlay.style.transition = 'opacity 0.1s ease';
        skipOverlay.style.zIndex = '9999';
        skipOverlay.style.userSelect = 'none';
        skipOverlay.style.display = 'flex';
        skipOverlay.style.flexDirection = 'column';
        skipOverlay.style.alignItems = 'center';
        skipOverlay.style.justifyContent = 'center';
        skipOverlay.style.gap = '0.2em';
        skipOverlay.style.minWidth = '75px';
        skipOverlay.style.minHeight = '75px';
        skipOverlay.style.textAlign = 'center';
        videoRoot.appendChild(skipOverlay);

        // Overlay to indicate Volume
        const volumeOverlay = document.createElement('div');
        volumeOverlay.style.position = 'absolute';
        volumeOverlay.style.top = '10%';
        volumeOverlay.style.left = '0';
        volumeOverlay.style.right = '0';
        volumeOverlay.style.margin = 'auto';
        volumeOverlay.style.padding = '7px 11px';
        volumeOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        volumeOverlay.style.borderRadius = '5px';
        volumeOverlay.style.pointerEvents = 'none';
        volumeOverlay.style.opacity = '0';
        volumeOverlay.style.transition = 'opacity 0.015s ease';
        volumeOverlay.style.zIndex = '9999';
        volumeOverlay.style.userSelect = 'none';
        volumeOverlay.style.display = 'flex';
        volumeOverlay.style.flexDirection = 'column';
        volumeOverlay.style.alignItems = 'center';
        volumeOverlay.style.justifyContent = 'center';
        volumeOverlay.style.gap = '0.2em';
        volumeOverlay.style.width = '50px';
        volumeOverlay.style.minHeight = '30px';
        volumeOverlay.style.textAlign = 'center';
        videoRoot.appendChild(volumeOverlay);

        // Overlay to indicate Play/Pause
        const centerOverlay = document.createElement('div');
        centerOverlay.style.position = 'absolute';
        centerOverlay.style.top = '50%';
        centerOverlay.style.left = '50%';
        centerOverlay.style.right = 'auto';
        centerOverlay.style.margin = '0';
        centerOverlay.style.transform = 'translate(-50%, -50%)';
        centerOverlay.style.padding = '15px';
        centerOverlay.style.fontVariantEmoji = 'text';
        centerOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        centerOverlay.style.borderRadius = '50%';
        centerOverlay.style.pointerEvents = 'none';
        centerOverlay.style.opacity = '0';
        centerOverlay.style.zIndex = '9999';
        centerOverlay.style.userSelect = 'none';
        centerOverlay.style.display = 'flex';
        centerOverlay.style.flexDirection = 'column';
        centerOverlay.style.alignItems = 'center';
        centerOverlay.style.justifyContent = 'center';
        centerOverlay.style.textAlign = 'center';
        videoRoot.appendChild(centerOverlay);

        const centerSymbol = document.createElement('span');
        centerSymbol.style.opacity = '1';
        centerOverlay.appendChild(centerSymbol);

        // Overlay text for current volume
        const volumeText = document.createElement('div');
        volumeText.style.fontSize = '17px';
        volumeText.style.fontWeight = '500';
        volumeText.style.color = 'rgba(255,255,255,0.85)';
        volumeText.style.userSelect = 'none';
        volumeOverlay.appendChild(volumeText);

        // Overlay container for left/right triangles
        const trianglesContainer = document.createElement('div');
        trianglesContainer.style.display = 'flex';
        trianglesContainer.style.gap = '10px';
        skipOverlay.appendChild(trianglesContainer);

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
        skipOverlay.appendChild(secondsText);

        let hideTimeoutSkipOverlay;
        let hideTimeoutVolumeOverlay;
        let hideTimeoutCenterOverlay;
        let animTimeouts = [];

        // Displays overlay triangle animation and seconds skipped
        const secondsToSkip = 5;
        function showAnimatedTriangles(side) {
            // Clear animation timers
            clearTimeout(hideTimeoutSkipOverlay);
            animTimeouts.forEach(t => clearTimeout(t));
            animTimeouts = [];

            const isLeft = side === 'left';
            const char = isLeft ? '◀' : '▶';
            const order = isLeft ? [2, 1, 0] : [0, 1, 2];

            triangles.forEach(t => {
                t.textContent = char;
                t.style.transition = 'none';
                t.style.color = 'rgba(255,255,255,0.3)';
            });

            // Force style flush to apply the color immediately before re-enabling transitions
            void skipOverlay.offsetHeight;
            triangles.forEach(t => { t.style.transition = 'color 0.3s ease'; });

            secondsText.textContent = `${secondsToSkip} seconds`;

            skipOverlay.style.opacity = '1';
            skipOverlay.style.left = isLeft ? '10%' : 'auto';
            skipOverlay.style.right = isLeft ? 'auto' : '10%';
            skipOverlay.style.textAlign = 'center';

            triangles[order[0]].style.color = 'rgba(255,255,255,0.75)';

            const interval = 200;

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

            hideTimeoutSkipOverlay = setTimeout(() => { skipOverlay.style.opacity = '0'; }, 3.3 * interval);
        }

        // Checks that the video player is focused
        function isInOnePlayerRoot(element) {
            while (element) {
                if (element === videoRoot)
                    return true;
                element = element.parentElement;
            }
            return false;
        }

        let video = null;

        function setupVideo(v) {
            if (!v || video === v)
                return;
            video = v;
        }

        // Initial attempt to find video
        setupVideo(videoRoot.querySelector('video'));

        // Observe videoRoot subtree for added/removed video
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations)
                for (const node of mutation.addedNodes)
                    if (node.nodeType === 1)
                        if (node.tagName === 'VIDEO')
                            setupVideo(node);
                        else {
                            const v = node.querySelector && node.querySelector('video');
                            if (v)
                                setupVideo(v);
                        }
        });

        observer.observe(videoRoot, { childList: true, subtree: true });


        function triggerCenterSymbol(symbol) {
            clearTimeout(hideTimeoutCenterOverlay);

            centerOverlay.style.width = '75px';
            centerOverlay.style.height = '75px';
            centerOverlay.style.transition = 'opacity 0.1s ease';
            centerOverlay.style.opacity = '1';

            hideTimeoutCenterOverlay = setTimeout(() => {
                centerOverlay.style.transition = 'width 0.6s ease, height 0.6s ease, font-size 0.6s ease, opacity 0.6s ease';
                centerOverlay.style.width = `${parseFloat(getComputedStyle(centerOverlay).width) + 25}px`;
                centerOverlay.style.height = `${parseFloat(getComputedStyle(centerOverlay).height) + 25}px`;
                centerOverlay.style.fontSize = `${parseFloat(getComputedStyle(centerOverlay).fontSize) + 22.5}px`;
                centerOverlay.style.opacity = '0';
            }, 60);

            centerSymbol.textContent = symbol;
            if (symbol === '🔊' || symbol === '🔇') {
                centerSymbol.style.marginBottom = '9px';
                centerSymbol.style.marginLeft = '5px';
                centerOverlay.style.fontSize = '75px';
            } else if (symbol === '🔉') {
                centerSymbol.style.marginBottom = '9px';
                centerSymbol.style.marginLeft = '0px';
                centerOverlay.style.fontSize = '75px';
            } else if (symbol === '▶') {
                centerSymbol.style.marginBottom = '7px';
                centerSymbol.style.marginLeft = '12px';
                centerOverlay.style.fontSize = '55px';
            } else if (symbol === '⏸') {
                centerSymbol.style.marginBottom = '17px';
                centerSymbol.style.marginLeft = '4px';
                centerOverlay.style.fontSize = '68px';
            }
        }


        // Math time: MS Stream/SharePoint handles volume steps exponentially (cubically) rather than linearly
        // The sequence is (steps of 0.1)^3, counting down from 1 to 0:
        // volume (base 𝑛) = (1 − 0.1 × 𝑛)^3, where 𝑛 = 0, 1, 2, ..., 10.
        // Alternatively, could just keep it to linear volume steps
        let currentVolumeStepCount = 0;
        function displayVolume() {
            const volumePercent = video.volume * 100;
            if (volumePercent >= 1 || video.volume == 0)
                volumeText.textContent = `${Math.round(volumePercent)}%`;
            else
                volumeText.textContent = `${volumePercent.toFixed(1)}%`;

            volumeOverlay.style.opacity = '1';
            clearTimeout(hideTimeoutVolumeOverlay);
            hideTimeoutVolumeOverlay = setTimeout(() => { volumeOverlay.style.opacity = '0'; }, 600);
        }

        document.addEventListener('keydown', e => {
            if (!video)
                return;
            if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey)
                return;
            if (document.activeElement && !isInOnePlayerRoot(document.activeElement))
                return;

            e.preventDefault();

            // → to skip forward
            if (e.code === 'ArrowRight') {
                video.currentTime = Math.min(video.duration, video.currentTime + secondsToSkip);
                showAnimatedTriangles('right');

            // ← to skip backward
            } else if (e.code === 'ArrowLeft') {
                video.currentTime = Math.max(0, video.currentTime - secondsToSkip);
                showAnimatedTriangles('left');

            // ↑ to increase volume
            } else if (e.code === 'ArrowUp') {
                if (currentVolumeStepCount > 0) {
                    currentVolumeStepCount--;
                    video.volume = Math.pow(1 - 0.1 * currentVolumeStepCount, 3);
                    //video.volume = Math.max(0, Math.min(1, Math.round((video.volume + 0.1) * 100) / 100));
                }
                displayVolume();
                triggerCenterSymbol('🔊');

            // ↓ to decrease volume
            } else if (e.code === 'ArrowDown') {
                if (currentVolumeStepCount < 10) {
                    currentVolumeStepCount++;
                    video.volume = Math.pow(1 - 0.1 * currentVolumeStepCount, 3);
                    //video.volume = Math.max(0, Math.min(1, Math.round((video.volume - 0.1) * 100) / 100));
                }
                displayVolume();

                if (video.volume == 0)
                    triggerCenterSymbol('🔇');
                else
                    triggerCenterSymbol('🔉');

            } else {
                // Adapted from [Sharepoint Keyboard Shortcuts] by [CyrilSLi], MIT License
                // https://greasyfork.org/en/scripts/524190-sharepoint-keyboard-shortcuts
                const keys = {
                    Space: document.querySelector('[aria-description*="Alt + K"]'),
                    KeyF: document.querySelector('[aria-description*="Alt + Enter"]'),
                    KeyM: document.querySelector('[aria-description*="Alt + M"]'),
                    KeyC: document.querySelector('[aria-description*="Alt + C"]'),
                    KeyA: document.querySelector('[aria-description*="Alt + A"]'),
                }

                if (e.code === 'Space') {
                    if (video.paused)
                        triggerCenterSymbol('▶');
                    else
                        triggerCenterSymbol('⏸');

                } else if (e.code === 'KeyM')
                    if (video.muted)
                        triggerCenterSymbol('🔊');
                    else
                        triggerCenterSymbol('🔇');

                if (keys.hasOwnProperty(e.code))
                    keys[e.code].click();
            }
        });

    });
})();
