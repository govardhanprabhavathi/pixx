document.addEventListener("DOMContentLoaded", () => {
    // Check if we are running locally
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
        // Enable live in-browser text editing for headings, content, and buttons
        document.designMode = "on";
        console.log("Design Mode is ON: You can now click and edit any text directly on the website (Localhost only).");
    } else {
        console.log("Design Mode is OFF: Production environment.");
    }

    // --- TV STATIC LOGIC ---
    const canvas = document.getElementById('static-canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    let staticAnimationId;
    let isMonitorOn = false;

    // Set canvas dimensions
    function resizeCanvas() {
        // High resolution static to prevent grainy stretch
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        // Update switch cord height if monitor is off/on
        if (switchCord) {
            switchCord.style.height = `${getBaseCordHeight()}px`;
        }
    });
    resizeCanvas();

    // --- FIXED NAV LOGIC ---
    const fixedNav = document.getElementById('fixed-nav');
    const glassHeader = document.getElementById('glass-header');

    window.addEventListener('scroll', () => {
        // Pop down when scrolled past 90% of the viewport (when the 2nd section stacks)
        if (window.scrollY > window.innerHeight * 0.9) {
            fixedNav.classList.add('visible');
            if (glassHeader) glassHeader.classList.add('visible');
        } else {
            fixedNav.classList.remove('visible');
            if (glassHeader) glassHeader.classList.remove('visible');
        }
    });

    fixedNav.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    function drawStatic() {
        const w = canvas.width;
        const h = canvas.height;
        const imgData = ctx.createImageData(w, h);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            // Generate black and white noise
            const noise = Math.random() * 255;
            data[i] = noise;     // red
            data[i + 1] = noise;   // green
            data[i + 2] = noise;   // blue
            data[i + 3] = 255;     // alpha
        }
        ctx.putImageData(imgData, 0, 0);
        staticAnimationId = requestAnimationFrame(drawStatic);
    }

    // Start static
    drawStatic();

    // --- SWITCH LOGIC ---
    const switchHandle = document.getElementById('switch-handle');
    const switchCord = document.getElementById('switch-cord');
    const monitorScreen = document.getElementById('monitor-screen');
    const screenVideo = document.getElementById('screen-video');

    // Zoom Elements
    const thirdSection = document.querySelector('.third-section');
    const zoomContainer = document.getElementById('zoom-container');
    const zoomTarget = document.getElementById('zoom-target');
    const dissolveFrame = document.getElementById('dissolve-frame');
    const sequenceCanvas = document.getElementById('sequence-canvas');
    const seqCtx = sequenceCanvas ? sequenceCanvas.getContext('2d', { alpha: false }) : null;
    const cinematicTitles = document.getElementById('cinematic-titles');
    const switchWrapper = document.querySelector('.spring-switch-wrapper');

    // --- Sequence Animation Preloader ---
    const FRAME_COUNT = 118; // Updated to match the shortened folder sequence
    const sequenceImages = [];

    for (let i = 1; i <= FRAME_COUNT; i++) {
        const img = new Image();
        const frameNum = i.toString().padStart(3, '0');
        img.src = `images/frames_ani/pixxframes_${frameNum}.png`;
        sequenceImages.push(img);
    }

    // Set canvas dimensions once first frame loads
    sequenceImages[0].onload = () => {
        if (sequenceCanvas && seqCtx) {
            sequenceCanvas.width = sequenceImages[0].width;
            sequenceCanvas.height = sequenceImages[0].height;
            seqCtx.drawImage(sequenceImages[0], 0, 0);
        }
    };

    function getBaseCordHeight() {
        return window.innerWidth <= 768 ? 150 : 250;
    }

    const MAX_PULL = 100; // pixels (so max stretch is 350px)
    const TRIGGER_THRESHOLD = 50; // pixels

    let isDragging = false;
    let startY = 0;
    let currentY = 0;

    // Pointer Events for drag support on mobile and desktop
    switchHandle.addEventListener('pointerdown', (e) => {
        // We removed the 'if (isMonitorOn) return;' so you can playfully pull it anytime
        isDragging = true;
        startY = e.clientY;
        switchHandle.setPointerCapture(e.pointerId);
        switchCord.style.transition = 'none';
    });

    switchHandle.addEventListener('pointermove', (e) => {
        if (!isDragging) return;

        const deltaY = e.clientY - startY;

        // Only allow pulling down, up to MAX_PULL
        if (deltaY > 0) {
            currentY = Math.min(deltaY, MAX_PULL);

            // Apply visual translation ONLY to the cord, handle follows automatically
            switchCord.style.height = `${getBaseCordHeight() + currentY}px`;
        }
    });

    function releaseSwitch(e) {
        if (!isDragging) return;
        isDragging = false;

        try {
            if (e && e.pointerId) {
                switchHandle.releasePointerCapture(e.pointerId);
            }
        } catch (err) { }

        // Robust spring back animation ONLY for the cord
        switchCord.style.transition = 'height 0.5s cubic-bezier(0.5, 2.5, 0.4, 0.9)';
        switchCord.style.height = `${getBaseCordHeight()}px`;

        // Check if pulled far enough to trigger
        if (currentY >= TRIGGER_THRESHOLD) {
            if (!isMonitorOn) {
                turnOnMonitor();
            } else {
                turnOffMonitor();
            }
        }

        currentY = 0;
    }

    switchHandle.addEventListener('pointerup', releaseSwitch);
    switchHandle.addEventListener('pointercancel', releaseSwitch);
    window.addEventListener('mouseup', releaseSwitch); // Failsafe
    window.addEventListener('touchend', releaseSwitch); // Failsafe

    // Ensure video freezes at the last frame and doesn't reset until monitor is turned off
    screenVideo.addEventListener('ended', () => {
        screenVideo.currentTime = screenVideo.duration;
        screenVideo.pause();
    });

    function turnOnMonitor() {
        isMonitorOn = true;

        // 1. Unlock the scroll container height natively (1500vh total)
        if (zoomContainer) {
            zoomContainer.style.height = '1500vh';
        }
        
        // 2. Reveal the bottom Gallery 3D section and new Cycle sequence so we can scroll to them
        const gallery3d = document.getElementById('gallery-3d');
        if (gallery3d) {
            gallery3d.style.display = 'flex'; // Uses flex for the 3D centering
        }
        const cycleScrollContainer = document.getElementById('cycle-scroll-container');
        if (cycleScrollContainer) {
            cycleScrollContainer.style.display = 'block';
        }

        // 2. Stop static
        cancelAnimationFrame(staticAnimationId);

        // 3. Add turning-on class to trigger CRT CSS animation
        monitorScreen.classList.add('turning-on');

        // 3. Start video and fade it in
        screenVideo.play();

        // The CRT flash animation is 0.6s. We reveal the video right at the peak of the flash (approx 300ms)
        setTimeout(() => {
            canvas.style.display = 'none'; // Hide static
            screenVideo.style.opacity = '1';
        }, 300);
    }

    function turnOffMonitor() {
        isMonitorOn = false;

        // Re-lock the scroll container and reset zoom/flash instantly
        if (zoomContainer) {
            zoomContainer.style.height = '100vh';
            if (zoomTarget) zoomTarget.style.transform = 'scale(1)';
            if (dissolveFrame) dissolveFrame.style.opacity = '0';
            if (switchWrapper) {
                switchWrapper.style.filter = 'blur(0px)';
                switchWrapper.style.opacity = '1';
            }
        }

        screenVideo.pause();
        screenVideo.currentTime = 0; // Reset video to start
        screenVideo.style.opacity = '0';
        
        const cycleScrollContainer = document.getElementById('cycle-scroll-container');
        if (cycleScrollContainer) {
            cycleScrollContainer.style.display = 'none';
        }

        canvas.style.display = 'block';
        drawStatic(); // Restart the static TV noise

        // Remove animation class so the CRT flash can be triggered again next time
        monitorScreen.classList.remove('turning-on');
    }

    // --- Premium Hardware Accelerated Scroll Zoom Loop ---
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!isMonitorOn || !zoomContainer || !zoomTarget || !dissolveFrame) return;

        if (!ticking) {
            window.requestAnimationFrame(() => {
                const rect = zoomContainer.getBoundingClientRect();

                // rect.top is 0 when container hits the top of viewport.
                // We have 1000vh total, viewport is 100vh. Scrollable distance = 900vh.
                const scrollDistance = -rect.top;

                // Boundaries
                const zoomEndScroll = window.innerHeight * 3; // 300vh (Zoom finishes)
                const blendEndScroll = window.innerHeight * 4; // 400vh (Blend finishes)
                const maxScroll = window.innerHeight * 8; // 800vh (End of sequence - shorter for 118 frames)
                const holdScroll = window.innerHeight * 9.5; // 950vh (Delay buffer)
                const titlesEndScroll = window.innerHeight * 14; // 1400vh (End of cinematic titles)

                if (scrollDistance < 0) {
                    zoomTarget.style.transform = 'scale(1)';
                    zoomTarget.style.opacity = '1';
                    if (thirdSection) thirdSection.style.backgroundColor = 'var(--white)';
                    dissolveFrame.style.opacity = '0';
                    if (sequenceCanvas) {
                        sequenceCanvas.style.opacity = '0';
                        sequenceCanvas.style.transform = 'translateY(0)';
                    }
                    if (cinematicTitles) cinematicTitles.style.transform = 'translateY(0)';
                    if (switchWrapper) {
                        switchWrapper.style.filter = 'blur(0px)';
                        switchWrapper.style.opacity = '1';
                    }
                } else if (scrollDistance <= zoomEndScroll) {
                    // PHASE 1: ZOOMING IN (0vh to 300vh)
                    const progress = scrollDistance / zoomEndScroll; // 0.0 to 1.0

                    if (thirdSection) thirdSection.style.backgroundColor = 'var(--white)';
                    zoomTarget.style.opacity = '1';
                    if (sequenceCanvas) {
                        sequenceCanvas.style.opacity = '0'; // Keep sequence hidden
                        sequenceCanvas.style.transform = 'translateY(0)';
                    }
                    if (cinematicTitles) cinematicTitles.style.transform = 'translateY(0)';

                    if (switchWrapper) {
                        const blurProgress = Math.min(progress / 0.15, 1);
                        switchWrapper.style.filter = `blur(${blurProgress * 20}px)`;
                        switchWrapper.style.opacity = `${1 - blurProgress}`;
                    }

                    const currentScale = Math.pow(25, Math.pow(progress, 3));
                    zoomTarget.style.transform = `scale(${currentScale})`;

                    // Crossfade dissolve frame at the very end of zoom
                    if (progress > 0.90) {
                        const fadeProgress = (progress - 0.90) / 0.10;
                        dissolveFrame.style.opacity = fadeProgress;
                    } else {
                        dissolveFrame.style.opacity = '0';
                    }

                    // Apply inverse scale to keep background stable
                    const inverseScale = 1 / currentScale;
                    const inverseTransform = `translate(-50%, -50%) scale(${inverseScale})`;
                    screenVideo.style.transform = inverseTransform;
                    canvas.style.transform = inverseTransform;
                    const crtOverlay = document.getElementById('crt-overlay');
                    if (crtOverlay) crtOverlay.style.transform = inverseTransform;

                } else {
                    // Lock zoom state since we are past 300vh
                    const finalInverseScale = 1 / 25;
                    const finalInverseTransform = `translate(-50%, -50%) scale(${finalInverseScale})`;

                    zoomTarget.style.transform = 'scale(25)';
                    screenVideo.style.transform = finalInverseTransform;
                    canvas.style.transform = finalInverseTransform;
                    const crtOverlay = document.getElementById('crt-overlay');
                    if (crtOverlay) crtOverlay.style.transform = finalInverseTransform;

                    if (switchWrapper) switchWrapper.style.opacity = '0';

                    // PHASE 2 & 3: BLENDING AND SEQUENCE PLAYBACK
                    if (thirdSection) thirdSection.style.backgroundColor = '#1e1e1e';

                    if (scrollDistance <= blendEndScroll) {
                        // Blend Phase (300vh to 400vh)
                        // Seamlessly fade out dissolve frame and monitor, and fade in sequence canvas
                        const blendProgress = (scrollDistance - zoomEndScroll) / window.innerHeight; // 0 to 1

                        zoomTarget.style.opacity = 1 - blendProgress;
                        dissolveFrame.style.opacity = 1 - blendProgress;
                        if (sequenceCanvas) {
                            sequenceCanvas.style.opacity = blendProgress;
                            // Ensure frame 1 is drawn
                            if (sequenceImages[0].complete && seqCtx) seqCtx.drawImage(sequenceImages[0], 0, 0);
                        }
                    } else {
                        // Sequence Playback Phase (400vh to 900vh)
                        zoomTarget.style.opacity = '0';
                        dissolveFrame.style.opacity = '0';
                        if (sequenceCanvas) sequenceCanvas.style.opacity = '1';

                        // Calculate which frame to show
                        const sequenceScrollable = maxScroll - blendEndScroll; // 500vh
                        const sequenceProgress = Math.max(0, Math.min(1, (scrollDistance - blendEndScroll) / sequenceScrollable));

                        // Map progress to frame index (0 to 239)
                        const frameIndex = Math.floor(sequenceProgress * (FRAME_COUNT - 1));

                        // Draw current frame
                        if (sequenceCanvas && seqCtx && sequenceImages[frameIndex] && sequenceImages[frameIndex].complete) {
                            seqCtx.drawImage(sequenceImages[frameIndex], 0, 0);
                        }

                        // PHASE 4: CINEMATIC TITLES & HOLD DELAY
                        let translateY = 0;
                        if (scrollDistance > maxScroll) {
                            const titlesScrollable = titlesEndScroll - holdScroll;
                            const titleLines = cinematicTitles ? cinematicTitles.querySelectorAll('.titles-heading, .titles-list li') : [];
                            
                            if (scrollDistance <= holdScroll) {
                                // Hold Phase: Delay scroll up. Logo is held still. "WHAT WE DO" fades in.
                                translateY = 0;
                                const holdProgress = (scrollDistance - maxScroll) / (holdScroll - maxScroll);
                                
                                if (titleLines[0]) {
                                    titleLines[0].style.opacity = Math.max(0, Math.min(1, holdProgress * 2));
                                    titleLines[0].style.transform = `translateY(${(1 - titleLines[0].style.opacity) * 50}px)`;
                                }
                                
                                // Ensure rest are hidden
                                for(let i = 1; i < titleLines.length; i++) {
                                    titleLines[i].style.opacity = '0';
                                    titleLines[i].style.transform = `translateY(50px)`;
                                }
                                
                            } else {
                                // Scroll Up Phase: Translates upwards and cascades list items
                                const titleProgress = Math.max(0, Math.min(1, (scrollDistance - holdScroll) / titlesScrollable));
                                
                                // Calculate exact pixel translation needed to align the 100px bottom padding with the viewport bottom
                                const titlesHeight = cinematicTitles ? cinematicTitles.offsetHeight : 0;
                                const maxTranslateY = Math.max(0, titlesHeight - (window.innerHeight * 0.25));
                                translateY = titleProgress * maxTranslateY; // px upward shift
                                
                                if (titleLines[0]) {
                                    titleLines[0].style.opacity = '1';
                                    titleLines[0].style.transform = `translateY(0)`;
                                }
                                
                                const totalListLines = titleLines.length - 1;
                                for(let i = 1; i <= totalListLines; i++) {
                                    const startProgress = ((i - 1) / totalListLines) * 0.7; 
                                    let lineProgress = (titleProgress - startProgress) / 0.15; 
                                    lineProgress = Math.max(0, Math.min(1, lineProgress));
                                    
                                    titleLines[i].style.opacity = lineProgress;
                                    titleLines[i].style.transform = `translateY(${(1 - lineProgress) * 50}px)`;
                                }
                            }
                        } else {
                            // Reset lines if scrolled back above maxScroll
                            const titleLines = cinematicTitles ? cinematicTitles.querySelectorAll('.titles-heading, .titles-list li') : [];
                            titleLines.forEach((line) => {
                                line.style.opacity = '0';
                                line.style.transform = `translateY(50px)`;
                            });
                        }
                        
                        if (sequenceCanvas) {
                            sequenceCanvas.style.transform = `translateY(-${translateY}px)`;
                        }
                        if (cinematicTitles) {
                            cinematicTitles.style.transform = `translateY(-${translateY}px)`;
                        }
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    });
    // --- Second Section Animations ---
    const secondSection = document.querySelector('.second-section');
    const scrollFillText = document.querySelector('.scroll-fill-text');
    const rollUpLines = document.querySelectorAll('.roll-up-text');

    // 1. Prepare Scroll Fill letters
    if (scrollFillText) {
        const lines = scrollFillText.innerHTML.split('<br>').map(l => l.trim());
        scrollFillText.innerHTML = lines.map(line => {
            return line.split('').map(char => {
                if (char === ' ') return ' ';
                return `<span class="fill-char">${char}</span>`;
            }).join('');
        }).join('<br>');
    }

    // 2. Prepare Roll Up words
    rollUpLines.forEach(line => {
        const words = line.textContent.trim().split(' ');
        line.innerHTML = words.map((word, i) =>
            `<span class="roll-up-word" style="transition-delay: ${i * 0.05}s">${word}</span>`
        ).join(' ');
    });

    // 2. Intersection Observer for Roll Up
    const rollUpObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.5 });

    rollUpLines.forEach(line => rollUpObserver.observe(line));

    // 3. Scroll Fill Progress
    window.addEventListener('scroll', () => {
        if (!secondSection || !scrollFillText) return;

        const rect = secondSection.getBoundingClientRect();
        const sectionHeight = rect.height;

        // Calculate how far we have scrolled into the second section
        // 0 at the start of section, 1 at the end
        const viewHeight = window.innerHeight;
        let progress = (viewHeight - rect.top) / (sectionHeight + viewHeight);
        progress = Math.max(0, Math.min(1, progress));

        // Refine progress to focus on the center of the scroll
        const refinedProgress = Math.max(0, Math.min(1, (progress - 0.25) / 0.5));

        // Letter by letter fill
        const chars = scrollFillText.querySelectorAll('.fill-char');
        const numChars = chars.length;
        const filledCount = Math.floor(refinedProgress * numChars);

        chars.forEach((char, index) => {
            if (index < filledCount) {
                char.classList.add('filled');
            } else {
                char.classList.remove('filled');
            }
        });
    });

    // 4. Random Blob Movement Logic
    const blobs = document.querySelectorAll('.second-section .blob');

    function moveBlobRandomly(blob) {
        // Random positions between -30% and 30% of their starting point
        const randomX = (Math.random() - 0.5) * 60;
        const randomY = (Math.random() - 0.5) * 60;
        const randomScale = 0.8 + Math.random() * 0.5; // 0.8 to 1.3

        blob.style.transform = `translate(${randomX}%, ${randomY}%) scale(${randomScale})`;

        // Pick a random duration for the next move (between 10 and 20 seconds)
        const nextMoveTime = 10000 + Math.random() * 10000;
        setTimeout(() => moveBlobRandomly(blob), nextMoveTime);
    }

    blobs.forEach(blob => {
        // Initial staggered start
        setTimeout(() => moveBlobRandomly(blob), Math.random() * 2000);
    });

    // --- 5. INFINITY DRAG CAROUSEL LOGIC ---
    const track = document.getElementById('carousel-track'); // The ID is still carousel-track
    const container = document.getElementById('work-carousel'); // ID is work-carousel
    
    if (track && container) {
        let isDownCaro = false;
        let startXCaro;
        let currentTranslate = 0;
        let prevTranslate = 0;
        
        let autoScrollSpeed = 1; // Pixels per frame
        let isDraggingCaro = false;
        
        // Ensure images are loaded before calculating width
        // But for a flex container, scrollWidth works fine if we just divide by 2 since it's perfectly duplicated.
        function getHalfWidth() {
            // Half the total width is exactly the width of one set of 5 images + their gaps
            return track.scrollWidth / 2;
        }

        function animateCarousel() {
            if (!isDraggingCaro) {
                currentTranslate -= autoScrollSpeed;
            }

            const halfWidth = getHalfWidth();
            // Seamless wrap condition
            if (currentTranslate <= -halfWidth) {
                currentTranslate += halfWidth;
                prevTranslate += halfWidth; // Keep drag offset in sync if user grabs right at the boundary
            } else if (currentTranslate > 0) {
                currentTranslate -= halfWidth;
                prevTranslate -= halfWidth;
            }

            track.style.transform = `translateX(${currentTranslate}px)`;
            requestAnimationFrame(animateCarousel);
        }
        
        animateCarousel();

        // Drag Handlers
        container.addEventListener('pointerdown', (e) => {
            isDownCaro = true;
            isDraggingCaro = true;
            startXCaro = e.pageX;
            prevTranslate = currentTranslate;
            container.style.cursor = 'grabbing';
        });

        window.addEventListener('pointerup', () => {
            if (!isDownCaro) return;
            isDownCaro = false;
            isDraggingCaro = false;
            container.style.cursor = 'grab';
        });

        window.addEventListener('pointercancel', () => {
            if (!isDownCaro) return;
            isDownCaro = false;
            isDraggingCaro = false;
            container.style.cursor = 'grab';
        });

        window.addEventListener('pointermove', (e) => {
            if (!isDownCaro) return;
            e.preventDefault();
            const x = e.pageX;
            const walk = (x - startXCaro) * 1.5; // Multiplier for drag sensitivity
            currentTranslate = prevTranslate + walk;
        });
    }

    // --- Cursor Following Image Placeholder Logic ---
    const cursorPlaceholder = document.getElementById('cursor-placeholder');
    const cursorImage = document.getElementById('cursor-image');
    const titlesListItems = document.querySelectorAll('.titles-list li');

    if (cursorPlaceholder && cursorImage) {
        // Track mouse globally
        window.addEventListener('mousemove', (e) => {
            // High performance positioning using requestAnimationFrame
            requestAnimationFrame(() => {
                cursorPlaceholder.style.left = `${e.clientX}px`;
                cursorPlaceholder.style.top = `${e.clientY}px`;
            });
        });

        titlesListItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                const imageSrc = item.getAttribute('data-image');
                if (imageSrc) {
                    // Instantly swap the image source
                    cursorImage.src = imageSrc;
                    cursorPlaceholder.classList.add('active');
                }
            });

            item.addEventListener('mouseleave', () => {
                cursorPlaceholder.classList.remove('active');
            });
        });
    }

    // --- Live-Save Logic (Ctrl+S) ---
    window.addEventListener('keydown', (e) => {
        if (!isLocalhost) return; // Completely disable save shortcut on Vercel

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault(); // Prevent standard browser save dialog
            
            console.log("Saving changes to index.html...");
            
            // Clone document to safely strip injected scripts without modifying live DOM
            const htmlClone = document.documentElement.cloneNode(true);
            
            // Remove live-server injected script (so it doesn't duplicate on save)
            const scripts = htmlClone.querySelectorAll('script');
            scripts.forEach(script => {
                if (script.innerHTML.includes('Code injected by live-server')) {
                    script.remove();
                }
            });

            // Clean up dynamically injected animation spans so they don't get permanently saved into the code
            const fillChars = htmlClone.querySelectorAll('.fill-char');
            fillChars.forEach(span => {
                span.replaceWith(span.textContent);
            });

            const rollUpWords = htmlClone.querySelectorAll('.roll-up-word');
            rollUpWords.forEach(span => {
                span.replaceWith(span.textContent);
            });

            // Clean up dynamically injected inline styles from scroll animations so they don't break the structure on reload
            const animatedElements = htmlClone.querySelectorAll('#zoom-container, #sticky-section, .spring-switch-wrapper, #switch-cord, #dissolve-frame, #sequence-canvas, #cinematic-titles, .titles-heading, .titles-list li, #zoom-target, #monitor-screen, #static-canvas, #screen-video, #crt-overlay, .gallery-3d, #cycle-scroll-container, #cycle-sticky-section, #cycle-canvas');
            animatedElements.forEach(el => {
                el.removeAttribute('style');
            });
            
            // Clean up dynamically added classes
            const monitorScreenClone = htmlClone.querySelector('#monitor-screen');
            if (monitorScreenClone) monitorScreenClone.classList.remove('turning-on');
            
            const fixedNavClone = htmlClone.querySelector('#fixed-nav');
            if (fixedNavClone) fixedNavClone.classList.remove('visible');
            
            const glassHeaderClone = htmlClone.querySelector('#glass-header');
            if (glassHeaderClone) glassHeaderClone.classList.remove('visible');
            
            // Reconstruct full HTML string
            const fullHTML = '<!DOCTYPE html>\n<html lang="en">\n' + htmlClone.innerHTML + '\n</html>';

            // Send to our local backend
            fetch('http://localhost:3000/save', {
                method: 'POST',
                headers: { 'Content-Type': 'text/html' },
                body: fullHTML
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log("Successfully saved to index.html!");
                } else {
                    console.error("Failed to save:", data.error);
                }
            })
            .catch(err => console.error("Server error. Is node server.js running on port 3000?", err));
        }
    });
    // --- CYCLE ANIMATION LOGIC ---
    const cycleCanvas = document.getElementById('cycle-canvas');
    const cycleCtx = cycleCanvas ? cycleCanvas.getContext('2d') : null;
    const cycleScrollContainer = document.getElementById('cycle-scroll-container');
    const CYCLE_FRAME_COUNT = 127;
    const cycleImages = [];
    let cycleImagesLoaded = 0;

    if (cycleCanvas && cycleScrollContainer) {
        // High resolution static to prevent grainy stretch
        cycleCanvas.width = 1920;
        cycleCanvas.height = 1080;

        // Preload frames
        for (let i = 1; i <= CYCLE_FRAME_COUNT; i++) {
            const img = new Image();
            const frameIndex = i.toString().padStart(3, '0');
            img.src = `images/cycle_ani/monitordisplay_20260426_184449_0000_${frameIndex}.png`;
            img.onload = () => {
                cycleImagesLoaded++;
                // Draw first frame once loaded
                if (i === 1 && cycleCtx) {
                    cycleCtx.drawImage(img, 0, 0, cycleCanvas.width, cycleCanvas.height);
                }
            };
            cycleImages.push(img);
        }

        let cycleTicking = false;
        window.addEventListener('scroll', () => {
            if (!isMonitorOn || !cycleScrollContainer) return;

            if (!cycleTicking) {
                window.requestAnimationFrame(() => {
                    const rect = cycleScrollContainer.getBoundingClientRect();
                    // rect.top is 0 when container hits the top of viewport.
                    // We have 400vh total, viewport is 100vh. Scrollable distance = 300vh.
                    const scrollDistance = -rect.top;
                    const maxScroll = window.innerHeight * 3;

                    if (scrollDistance >= 0 && scrollDistance <= maxScroll) {
                        const progress = scrollDistance / maxScroll;
                        const frameIndex = Math.floor(progress * (CYCLE_FRAME_COUNT - 1));

                        if (cycleCtx && cycleImages[frameIndex] && cycleImages[frameIndex].complete) {
                            cycleCtx.drawImage(cycleImages[frameIndex], 0, 0, cycleCanvas.width, cycleCanvas.height);
                        }
                    } else if (scrollDistance < 0) {
                        // Before container
                        if (cycleCtx && cycleImages[0] && cycleImages[0].complete) {
                            cycleCtx.drawImage(cycleImages[0], 0, 0, cycleCanvas.width, cycleCanvas.height);
                        }
                    } else if (scrollDistance > maxScroll) {
                        // After container
                        if (cycleCtx && cycleImages[CYCLE_FRAME_COUNT - 1] && cycleImages[CYCLE_FRAME_COUNT - 1].complete) {
                            cycleCtx.drawImage(cycleImages[CYCLE_FRAME_COUNT - 1], 0, 0, cycleCanvas.width, cycleCanvas.height);
                        }
                    }
                    cycleTicking = false;
                });
                cycleTicking = true;
            }
        });
    }
});
