# 7Up-Bot

Fonctionnel 08/10/25

Si ça ne fonctionne plus ne venez pas m'harceler !!!

Et on oublie pas l'étoile

An attempt to automatize [7Speaking](7speaking.com). Works for "My7Speaking" and TOEIC (Trainings + Exams).

## How to install
- Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
- [Click here](https://github.com/Shun-Lassal/7Up-Bot/raw/main/7Speaking-bot-9.user.js) to install the script or clic "RAW".
![image](https://github.com/Dixel1/7speaking-bot-legacy/assets/63664894/4d7af9cc-8765-4d2f-b4cc-52db5ff5f256)


- Go to [https://user.7speaking.com/home](https://user.7speaking.com/home) or [https://user.7speaking.com/workshop/exams-tests/toeic](https://user.7speaking.com/workshop/exams-tests/toeic) depending on what you want to complete (may not work properly on toeic mode. Please check https://github.com/Dixel1/7speaking-bot-legacy/issues).
- Let the bot do its work.
- Enjoy!

# Changelogs :

#### v8.5

Here’s a summary of the changes made to the code:

- Conversion to String: The findAnswer function was modified to convert the response into a string. This adjustment allows handling cases where the response is a number.
- Simulating Keystrokes: When the input type is ‘input’, the code was altered to simulate typing each character of the response. This is achieved using the document.execCommand('insertText', false, answer[i]); method within a loop.
- Random Response Delay: The response delay after entering the answer was adjusted to be random, ranging between 3 and 8 seconds. This is accomplished by using Math.random() to generate a random number, multiplying it by the difference between the maximum and minimum delay, and then adding the minimum delay.

### MY CHANGES:

#### v9

- **Feature**: Added support for detecting dynamic URLs matching the `/TEXT/NUMBER/NUMBER/NUMBER/` pattern.
  - This includes URLs such as `/professional-survival-kit/66/1/3` or similar structures.
  - Implemented a flexible route check with regex that allows for hyphens in the text portion, enabling broader matching.
  - When the script encounters such routes, it now clicks on a button within a div of class `kpds-action-bottom`, if present.
