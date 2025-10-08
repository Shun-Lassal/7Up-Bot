// ==UserScript==
// @name         7Speaking Bot Legacy - BETA
// @namespace    https://github.com/Dixel1
// @version      9.9
// @description  Automatize 7speaking
// @author       quantumsheep & Dixel1
// @match        https://user.7speaking.com/*
// @grant        none
// @help         Juliendnte
// @tuners       Astronas
// ==/UserScript==

// This script is designed to automate the process of completing quizzes and exams on the 7speaking platform.
// It uses a combination of React component traversal and DOM manipulation to find the correct answers and submit them.
// The script is structured to handle different routes on the 7speaking platform, including home, workshop, document, and quiz pages.

// Tuned by Astronas

// [GLOBAL VARIABLES]
// errorProbability: The probability of introducing an error in the answer (0.2 = 20% chance of error)
// useRealTime: Determines whether to use between 60-80% of the recommended real activity time or a fixed time (10s)

const errorProbability = 0.2; // Probability of introducing an error in the answer (put a value between 0 and 1)
let useRealTime = 0; // Variable to determine whether to use between 60-80% of the recommended real activity time or a fixed time (10s) (1 = use real time, 0 = use fixed time)

// Dont change these variables unless you know what you're doing
let realTime = 10; // The fixed time in seconds to wait before clicking the test tab (if useRealTime is set to 0)
let actualTime = 0; // Variable to store the actual time for the quiz or exam, calculated based on the recommended time

(async () => { // Main function to run the script
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms)); // Function to wait for a specified number of milliseconds
    const scheduleNext = (delay = 1500) => setTimeout(() => routes().catch(console.error), delay);

    function isPath(regex) { // Function to check if the current path matches a given regular expression
        return regex.test(location.pathname); // Check if the current pathname matches the regex
    }

    function error(message) { // Function to handle errors
        alert(message); // Display an alert with the error message
        throw new Error(message); // Throw an error with the message
    }

    async function waitForQuerySelector(selector) { // Function to wait for a specific element to be available in the DOM
        console.log(`Waiting for querySelector('${selector}')`) // Log the selector being waited for

        return new Promise(resolve => { // Return a promise that resolves when the element is found
            const interval = setInterval(() => { // Set an interval to check for the element every second
                const e = document.querySelector(selector); // Query the DOM for the element

                if (e) { // If the element is found
                    clearInterval(interval); // Clear the interval to stop checking
                    resolve(e); // Resolve the promise with the found element
                }
            }, 1000); // Check every second for the element
        }); // End of waitForQuerySelector function
    }

    async function handlePopup() { // Function to handle popups that may appear during the quiz or exam
        const popup = await waitForQuerySelector('.MuiDialog-container').catch(() => null); // Wait for the popup element to be available, or return null if not found
        if (popup) { // If a popup is detected
            console.log('Popup détectée'); // Log that a popup is detected

            const continueButton = popup.querySelector('.MuiDialogActions-root button'); // Try to find the "Continue" button in the popup
            if (continueButton) { // If the "Continue" button is found
                console.log('"Continue" button found'); // Log that the "Continue" button is found
                continueButton.click(); // Click the "Continue" button to proceed
                console.log('"Continue" button clicked'); // Log that the "Continue" button is clicked
            } else { // If the "Continue" button is not found
                console.error('"Continue" button not found'); // Log an error that the "Continue" button is not found
            }
        } else { // If no popup is detected
            console.log('No popup found'); // Log that no popup is detected
        } // End of handlePopup function
    }

    function parseTime(text) { // Function to parse the recommended activity time from a string
        const regex = /(\d+)(min|h)/; // Regular expression to match the time format (e.g., "30min" or "1h")
        const match = text.match(regex); // Match the text against the regular expression
        if (match) { // If a match is found
            const value = parseInt(match[1]); // Extract the numeric value from the match
            const unit = match[2]; // Extract the unit (either "min" or "h") from the match
            switch (unit) { // Switch case to handle different time units
                case 'min': // If the unit is "min"
                    return value * 60; // Convert minutes to seconds
                case 'h': // If the unit is "h"
                    return value * 3600; // Convert hours to seconds
                default: // If the unit is not recognized
                    throw new Error(`Non-supported time format : ${unit}`); // Throw an error for unsupported time units
            }
        } else { // If no match is found
            throw new Error(`Format de temps non reconnu : ${text}`); // Throw an error for unrecognized time format
        } // End of parseTime function
    }

    function handleTime() {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                const durationCounter = document.querySelector('.durationCounter p.MuiTypography-body1');
                if (durationCounter) {
                    clearInterval(intervalId);
                    const recommendedTimeText = durationCounter.textContent;
                    const recommendedTime = parseTime(recommendedTimeText);

                    const minTime = recommendedTime * 0.6;
                    const maxTime = recommendedTime * 0.8;
                    const actualTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;

                    console.log(`Temps recommandé : ${recommendedTime} secondes`);
                    console.log(`Temps réel : ${actualTime} secondes`);

                    resolve(actualTime);
                }
            }, 100); // Vérifie toutes les 100ms
        });
    }

    function getReactElement(e) {
        for (const key in e) {
            if (key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')) {
                return e[key];
            }
        }
        return null;
    }

    // === Helpers added ===
    function normalizeText(str) {
        return (str || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function getInputElement(answerRaw) {
        const answer = normalizeText(answerRaw);

        // 1. Text input (fill in the blank)
        const textInputs = document.querySelectorAll('.answer-container input[type="text"], .answer-container input:not([type]), .answer-container textarea');
        if (textInputs.length === 1) {
            return { type: 'input', element: textInputs[0] };
        }
        if (textInputs.length > 1) {
            // Try to find an empty one
            for (const inp of textInputs) {
                if (!inp.value) {
                    return { type: 'input', element: inp };
                }
            }
            return { type: 'input', element: textInputs[0] };
        }

        // 2. Choice buttons
        const buttons = document.querySelectorAll('.answer-container button, .answer-container .MuiButtonBase-root');
        let fallback = null;
        for (const b of buttons) {
            const txt = normalizeText(b.textContent);
            if (!fallback && txt) fallback = b;
            if (txt === answer) {
                return { type: 'button', element: b };
            }
            // Allow minor trailing punctuation or extra spaces
            if (txt.replace(/[.,!?;:]+$/,'') === answer) {
                return { type: 'button', element: b };
            }
        }

        // 3. Radio/label based options
        const labels = document.querySelectorAll('.answer-container label');
        for (const lbl of labels) {
            const txt = normalizeText(lbl.textContent);
            if (txt === answer) {
                // Clickable element might be input inside label
                const input = lbl.querySelector('input');
                return { type: input ? 'button' : 'button', element: input || lbl };
            }
        }

        if (fallback) {
            console.warn('Exact match not found, using first non-empty button as fallback');
            return { type: 'button', element: fallback };
        }

        console.warn('No input/button found for answer:', answerRaw);
        return null;
    }

    function getSubmitButton() {
        // Common texts: Validate, Next, Suivant, Valider, Check, Continue
        const texts = ['validate','next','valider','suivant','continue','ok'];
        const buttons = document.querySelectorAll('button');
        let candidate = null;
        for (const b of buttons) {
            const t = normalizeText(b.textContent);
            if (texts.includes(t)) return b;
            // Some buttons show two states (Validate -> Next). Keep first containing validate
            if (/validate|valider/.test(t) && !candidate) candidate = b;
        }
        if (!candidate && buttons.length) {
            // Heuristic: last prominent button
            candidate = buttons[buttons.length - 1];
        }
        if (!candidate) console.warn('Submit button not found');
        return candidate;
    }

    async function completeQuiz() {
        console.log(`Starting quiz completion...`);

        function extractAnswerFromProps(p) {
            if (!p || typeof p !== 'object') return null;

            // Direct simple answer
            if (p.answer && typeof p.answer === 'string') return p.answer;

            // Sometimes answer is nested like { answerOptions: { answer: [ { value: '...' } ] } }
            if (p.answerOptions && p.answerOptions.answer && Array.isArray(p.answerOptions.answer)) {
                const first = p.answerOptions.answer[0];
                if (first && typeof first.value !== 'undefined') {
                    return String(first.value);
                }
            }

            // Explore children props recursively
            const children = p.children;
            if (Array.isArray(children)) {
                for (const c of children) {
                    if (c && c.props) {
                        const r = extractAnswerFromProps(c.props);
                        if (r) return r;
                    }
                }
            } else if (children && children.props) {
                const r = extractAnswerFromProps(children.props);
                if (r) return r;
            }
            return null;
        }

        async function findAnswer() {
            const el = await waitForQuerySelector('.question-container');
            const fiber = getReactElement(el);
            if (!fiber) {
                console.warn('No React fiber found on question container');
                return null;
            }

            const visited = new Set();
            function traverse(node) {
                if (!node || visited.has(node)) return null;
                visited.add(node);

                const props = node.memoizedProps || node.pendingProps;
                const ans = extractAnswerFromProps(props);
                if (ans) return ans;

                // Depth-first: child -> sibling
                let childAns = traverse(node.child);
                if (childAns) return childAns;

                return traverse(node.sibling);
            }

            return traverse(fiber);
        }

        const answer = await findAnswer();

        if (answer == null) {
            console.error('Answer not found after traversal');
            return error("Can't find answer");
        }

        console.log(`Answer is "${answer}"`);

        const input = getInputElement(answer);

        if (!input) {
            return error("Can't find input");
        }

        console.log(`Question type is "${input.type}"`);

        const shouldSimulateError = Math.random() < errorProbability;

        if (input.type === 'input') {
            await wait(2000);
            if (shouldSimulateError) {
                const incorrectAnswer = "random";
                for (let i = 0; i < incorrectAnswer.length; i++) {
                    input.element.focus();
                    document.execCommand('insertText', false, incorrectAnswer[i]);
                    await wait(Math.random() * (400 - 100) + 100);
                }
                console.log(`Simulated error: entered "${incorrectAnswer}" instead of "${answer}"`);
            } else {
                for (let i = 0; i < answer.length; i++) {
                    input.element.focus();
                    document.execCommand('insertText', false, answer[i]);
                    await wait(Math.random() * (400 - 100) + 100);
                }
            }
            input.element.blur();
            await wait(Math.random() * (8000 - 3000) + 3000);
        } else if (input.type === 'button') {
            if (shouldSimulateError) {
                const buttons = document.querySelectorAll('.answer-container button');
                const incorrectButtonIndex = Math.floor(Math.random() * buttons.length);
                const incorrectButton = buttons[incorrectButtonIndex];
                if (incorrectButton !== input.element) {
                    incorrectButton.click();
                    console.log(`Simulated error: clicked on incorrect button`);
                } else {
                    if (buttons.length > 1) {
                        const anotherButtonIndex = (incorrectButtonIndex + 1) % buttons.length;
                        const anotherButton = buttons[anotherButtonIndex];
                        anotherButton.click();
                        console.log(`Simulated error: clicked on another button`);
                    }
                }
            } else {
                input.element.click();
            }
        }

        handlePopup();

        await wait(Math.random() * (300 - 200) + 200);

        const button = getSubmitButton();

        if (!button) {
            return error("Can't find submit button");
        }

        console.log(`Clicking "Validate" button`);
        // Uncomment the next line to add a random delay before clicking the "Validate" button

        // await wait(Math.random() * 120000); // Random delay between 0-2 mins before clicking "Validate"

        button.click(); // Click the "Validate" button

        await wait(Math.random() * (1500 - 1000) + 1000); // Add delay after clicking "Validate"

        console.log(`Clicking "Next" button`); // Click the "Next" button

        button.click(); // Click the "Next" button again (this is usually the same button as "Validate")

        await wait(Math.random() * (600 - 400) + 400); // Add a small delay after clicking "Next"
        console.log(`Waiting for the next question...`);
    }

    async function completeExam() { // Function to complete the exam
        async function findAnswer() { // Function to find the answer in the React component tree
            const e = await waitForQuerySelector('.question_content'); // Wait for the question content to be available
            let container = getReactElement(e); // Get the React element from the question content

            while (container) { // Traverse the React component tree
                if (container.memoizedProps && container.memoizedProps.questions) { // Check if the component has questions
                    const [question] = container.memoizedProps.questions; // Get the first question from the questions array

                    if (question.needorder) { // Check if the question requires ordering of answers
                        console.log(`Question requires ordering of answers`);
                        const options = {}; // Initialize an empty object to store the ordered answers

                        for (const k in question.answer) { // Iterate over the answer keys
                            options[k] = question.answer[k].sort((a, b) => a - b); // Sort the answers in ascending order
                        }

                        return options; // Return the ordered answers
                    }

                    return question.answer; // Return the answer of the question
                }

                container = container.return; // Move up the React component tree
            }

            return null; // Return null if no answer is found
        } // End of findAnswer function

        const answer = await findAnswer(); // Call the findAnswer function to get the answer

        if (answer === null || answer === undefined) { // Check if the answer is null or undefined
            const submitButton = document.querySelector('.buttons_container button:last-child'); // Try to find the submit button in the buttons container

            if (!submitButton) { // Check if the submit button was found
                return error("Can't find answer"); // If no submit button is found, throw an error
            } else { // If the submit button is found
                submitButton.click(); // Click the submit button
                await wait(Math.random() * (2000 - 1000) + 1000); // Add a delay after clicking the submit button
            }
        } else { // If an answer is found
            if (typeof answer === 'object') { // Check if the answer is an object (indicating multiple answers)
                const optionsAreTypeof = (type) => Object.values(answer).every(options => options.every(option => typeof option === type)) ; // Function to check if all options are of a specific type
                console.log(`Answer is an object with ${Object.keys(answer).length} keys`); // Log the number of keys in the answer object

                if (optionsAreTypeof('boolean')) { // Check if all options are booleans
                    console.log(`Options are booleans`); // Log that the options are booleans

                    const lines = [...document.querySelectorAll('.question_variant tbody tr')]; // Get all table rows in the question variant

                    for (const i in lines) { // Iterate over each line in the question variant
                        const inputs = lines[i].querySelectorAll('td input'); // Get all input elements in the current line

                        for (const j in answer) { // Iterate over each answer key
                            const input = inputs[+j - 1]; // Get the input element for the current answer key

                            if (answer[j][i]) { // Check if the answer for the current key and line is true
                                input.click(); // Click the input element if the answer is true
                            }
                        }
                    }
                } else if (optionsAreTypeof('string') || optionsAreTypeof('number')) { // Check if all options are strings or numbers
                    console.log(`Options are strings/numbers`); // Log that the options are strings or numbers

                    const columns = [...document.querySelectorAll('.question_variant tbody tr td')]; // Get all table cells in the question variant

                    for (const i in answer) { // Iterate over each answer key
                        const inputs = columns[+i - 1].querySelectorAll('input'); // Get all input elements in the current column

                        for (const j in answer[i]) { // Iterate over each answer in the current key
                            const input = getReactElement(inputs[j]); // Get the React element for the current input

                            input.memoizedProps.onChange({ // Trigger the onChange event for the input element
                                target: { // Set the target of the event
                                    value: answer[i][j].toString(), // Set the value of the input to the current answer
                                },
                            });
                        }
                    }
                } else {
                    return error(`Can't understand this type of options`); // If the options are neither booleans, strings, nor numbers, throw an error
                }

                await wait(Math.random() * (2000 - 1000) + 1000); // Add a delay after filling the inputs
            } else {
                const inputs = document.querySelectorAll('.question_variant label'); // Get all label elements in the question variant

                if (isNaN(answer)) { // Check if the answer is not a number (indicating multiple choice options)
                    const options = answer.split(','); // Split the answer string by commas to get the individual options

                    for (const option of options) { // Iterate over each option in the answer
                        inputs[option.charCodeAt(0) - 'A'.charCodeAt(0)].click(); // Click the input element corresponding to the option (A, B, C, etc.)
                    }
                } else { // If the answer is a number (indicating a single choice option)
                    inputs[+answer - 1].click(); // Click the input element corresponding to the answer number
                }
            }

            const submitButton = await waitForQuerySelector('.buttons_container button:last-child'); // Wait for the submit button to be available

            submitButton.click(); // Click the submit button to submit the answers
            await wait(Math.random() * (2000 - 1000) + 1000); // Add a delay after clicking the submit button

            submitButton.click(); // Click the submit button again to confirm the submission
            await wait(Math.random() * (2000 - 1000) + 1000); // Add a delay after clicking the submit button again
        }
    }

    async function routes() { // Function to handle different routes on the 7speaking platform
        console.log(`Analysing current route`); // Log the current route being analyzed

        if (isPath(/^\/home/)) {
            console.log(`Current route is /home`);
            console.log(`Selecting the first content...`);
            const e = await waitForQuerySelector('.scrollableList .scrollableList__content .MuiButtonBase-root').catch(()=>null);
            if (e) e.click();
            scheduleNext(2500);
            return;

        } else if (isPath(/^\/workshop\/exams-tests/)) {
            const search = new URLSearchParams(location.search);
            if (search.has('id')) {
                await completeExam();
                scheduleNext(1200);
                return;
            } else {
                const nextExam = await waitForQuerySelector('.lists .list__items.active').catch(()=>null);
                if (nextExam) nextExam.click();
                await wait(Math.random() * (600 - 300) + 300);
                const modalConfirmButton = document.querySelector('.confirmCloseDialog__buttons button:last-child');
                if (modalConfirmButton) modalConfirmButton.click();
                await wait(Math.random() * (3000 - 1000) + 1000);
                scheduleNext(1500);
                return;
            }

        } else if (isPath(/^\/workshop/)) {
            console.log(`Current route is /workshop`);
            await waitForQuerySelector('.banner').catch(()=>null);
            const buttons = document.querySelectorAll('.bottom-pagination .pagination button');
            if (buttons.length > 0) buttons[buttons.length - 1].click();
            let quizButton = document.querySelector('.category-action-bottom button') ||
                             document.querySelector('button.cardMode__goToQuiz:not(.finalCard__btns button)');
            if (!quizButton) {
                console.log("Can't find quiz button, returning to /home");
                location.href = '/home';
                return;
            }
            quizButton.click();
            scheduleNext(1500);
            return;

        } else if (isPath(/^\/document\/\d+/)) {
            console.log(`Current route is /document`);
            const e = await waitForQuerySelector('.appBarTabs__testTab').catch(()=>null);
            if (!e) { scheduleNext(1500); return; }
            if (useRealTime === 1) {
                actualTime = await handleTime();
                const scriptButton = document.querySelector('.videoControls__rightContent .icon__iconButton');
                if (scriptButton) {
                    scriptButton.click();
                    console.log('Bouton "Script" cliqué');
                }
                console.log(`Using 60-80% real time ... waiting for ${actualTime} seconds before clicking the test tab`);
                await wait(actualTime * 1000);
            } else {
                console.log(`Not using real time, waiting for ${realTime} seconds before clicking the test tab`);
                await wait(realTime * 1000);
            }
            e.click();
            scheduleNext(2000);
            return;

        } else if (isPath(/^\/quiz/)) {
            console.log(`Current route is /quiz`);
            await waitForQuerySelector('.quiz__container').catch(()=>null);
            if (document.querySelector('.result-container')) {
                location.href = '/home';
                return;
            } else {
                await completeQuiz();
                scheduleNext(1200);
                return;
            }

        } else if (isPath(/^\/professional-survival-kit\//)) {
            // In-between quizzes page handler
            console.log('Between-quiz page detected');
            const nextBtn = await waitForQuerySelector('button.cardMode__goToQuiz, .cardMode__goToQuiz').catch(()=>null);
            if (nextBtn) {
                console.log('Clicking next quiz button');
                nextBtn.click();
                scheduleNext(1800);
                return;
            } else {
                console.log('Next quiz button not found, redirecting to /home');
                location.href = '/home';
                return;
            }
        }

        // Fallback: try again later
        scheduleNext(2000);
    }

    if (document.readyState === 'complete') {
        routes().catch(console.error);
    } else {
        window.addEventListener('load', () => routes().catch(console.error));
    }
})();

// End of script
