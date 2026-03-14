// Global variables
let sections = [];
let currentSectionIndex = 0;
let currentQuestionIndex = 0;
let timerInterval;
let timeRemaining = 0;
let testStarted = false;
let darkMode = true; // Enable dark mode initially
let answers = {};

// DOM elements
const setupScreen = document.getElementById('setup-screen');
const testScreen = document.getElementById('test-screen');
const resultsScreen = document.getElementById('results-screen');
const sectionsContainer = document.getElementById('sections-container');
const sectionTabsContainer = document.getElementById('section-tabs');
const testTitleInput = document.getElementById('test-title');
const testTitleDisplay = document.getElementById('test-title-display');
const sectionsCountInput = document.getElementById('sections-count');
const parseQuestionsBtn = document.getElementById('parse-questions');
const startTestBtn = document.getElementById('start-test-btn');
const toggleModeBtn = document.getElementById('toggle-mode');
const endTestBtn = document.getElementById('end-test-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const testTimer = document.getElementById('test-timer');
const progressBar = document.getElementById('progress-bar');
const questionsContainerUI = document.getElementById('questions-container');
const currentSectionName = document.getElementById('current-section-name');
const correctAnswersEl = document.getElementById('correct-answers');
const incorrectAnswersEl = document.getElementById('incorrect-answers');
const skippedQuestionsEl = document.getElementById('skipped-questions');
const resultsDetails = document.getElementById('results-details');
const downloadPdfBtn = document.getElementById('download-pdf');
const backToSetupBtn = document.getElementById('back-to-setup');

function init() {
  // Setup initial dark mode
  document.body.classList.add('dark-mode');
  toggleModeBtn.textContent = 'Light Mode';

  sectionsCountInput.addEventListener('change', updateSectionsUI);
  parseQuestionsBtn.addEventListener('click', parseQuestions);
  startTestBtn.addEventListener('click', startTest);
  toggleModeBtn.addEventListener('click', toggleDarkMode);
  endTestBtn.addEventListener('click', endTest);
  prevBtn.addEventListener('click', showPreviousQuestion);
  nextBtn.addEventListener('click', showNextQuestion);
  downloadPdfBtn.addEventListener('click', downloadPDF);
  backToSetupBtn.addEventListener('click', backToSetup);

  // Auto-submit test if user switches tab or hides page
  document.addEventListener('visibilitychange', () => {
    if (testStarted && document.hidden) {
      alert('You switched tabs. The test will now be submitted.');
      endTest();
    }
  });

  updateSectionsUI();
}
document.addEventListener('DOMContentLoaded', init);

function updateSectionsUI() {
  const count = parseInt(sectionsCountInput.value);
  sectionsContainer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const nameVal = `Section ${i + 1}`;
    sectionsContainer.innerHTML += `
      <div class="card mb-4">
        <div class="card-body">
          <h4 class="card-title">Section ${i + 1}</h4>
          <div class="mb-3">
            <label class="form-label">Section Name</label>
            <input type="text" class="form-control section-name" placeholder="${nameVal}" value="${nameVal}">
          </div>
          <div class="mb-3">
            <label class="form-label">Time (minutes)</label>
            <input type="number" class="form-control section-time" min="1" value="10">
          </div>
          <div class="mb-3">
            <label class="form-label">Paste Questions (in NTA format)</label>
            <textarea class="form-control question-input section-questions"></textarea>
            <div class="form-text text-info">
              Format each question as:<br/>
              <strong>Q1.</strong> Question text here<br/>
              a) Option A<br/>
              b) Option B<br/>
              c) Option C<br/>
              d) Option D<br/>
              <strong>Answer: a) Option A</strong><br/>
              (Add a blank line between questions)
            </div>
          </div>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input section-shuffle" checked>
            <label class="form-check-label">Shuffle Questions</label>
          </div>
          <div class="question-preview section-preview">
            <p class="text-center">Questions will appear here after parsing</p>
          </div>
        </div>
      </div>
    `;
  }
  // Live preview on textarea input
  const sectionQuestionInputs = sectionsContainer.querySelectorAll('.section-questions');
  sectionQuestionInputs.forEach(input => {
    input.addEventListener('input', parseSectionQuestions);
  });
}

function parseQuestions() {
  const textareas = sectionsContainer.querySelectorAll('.section-questions');
  const previews = sectionsContainer.querySelectorAll('.section-preview');
  textareas.forEach((ta, idx) => {
    const questions = parseQuestionsText(ta.value);
    if (questions.length > 0) {
      previews[idx].innerHTML = `<p>Successfully parsed <strong>${questions.length}</strong> questions:</p><ol>${questions.map(q => `<li>${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}</li>`).join('')}</ol>`;
    } else {
      previews[idx].innerHTML = `<p class="text-danger">No questions could be parsed. Please check your format.</p>`;
    }
  });
}

function parseSectionQuestions(e) {
  const textarea = e.target;
  const preview = textarea.closest('.card-body').querySelector('.section-preview');
  const questions = parseQuestionsText(textarea.value);
  if (questions.length > 0) {
    preview.innerHTML = `<p>Parsed <strong>${questions.length}</strong> questions:</p><ol>${questions.map(q => `<li>${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}</li>`).join('')}</ol>`;
  } else {
    preview.innerHTML = `<p class="text-danger">No questions could be parsed.</p>`;
  }
}

function parseQuestionsText(text) {
  const questions = [];
  const lines = text.split('\n');
  let q = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^Q\d+\./.test(line)) {
      if (q) questions.push(q);
      q = { text: line, options: [], correctAnswer: null };
    } else if (/^[a-d]\)/i.test(line) && q) {
      q.options.push(line);
    } else if (/^Answer:/i.test(line) && q) {
      const match = line.match(/[a-d]\)/i);
      if (match) {
        const answerChar = match[0][0].toLowerCase();
        q.correctAnswer = answerChar.charCodeAt(0) - 97;
      }
    } else if (q) {
      q.text += ' ' + line;
    }
  }
  if (q) questions.push(q);
  return questions;
}

function startTest() {
  const testTitle = testTitleInput.value || 'NTA Style Test';
  testTitleDisplay.textContent = testTitle;
  sections = [];
  answers = {};
  const sectionCards = sectionsContainer.querySelectorAll('.card');
  sectionCards.forEach((card, idx) => {
    const name = card.querySelector('.section-name').value.trim() || `Section ${idx + 1}`;
    const time = parseInt(card.querySelector('.section-time').value);
    const questionsText = card.querySelector('.section-questions').value;
    let questions = parseQuestionsText(questionsText);
    if (questions.length > 0) {
      sections.push({
        name, time, questions, questionsCount: questions.length
      });
    }
  });
  sections.forEach((section, sidx) => {
    answers[sidx] = {};
    for (let q = 0; q < section.questions.length; q++) {
      answers[sidx][q] = null;
    }
  });
  if (sections.length === 0) {
    alert('No section has valid questions. Please enter questions.');
    return;
  }
  setupTestUI();
  currentSectionIndex = 0;
  currentQuestionIndex = 0;
  setupScreen.classList.add('d-none');
  testScreen.classList.remove('d-none');
  startSectionTimer(0);
  showQuestion(0, 0);
  document.addEventListener('keydown', preventTabSwitch);
  document.documentElement.requestFullscreen().catch(() => {});
  testStarted = true;
}

function setupTestUI() {
  sectionTabsContainer.innerHTML = '';
  sections.forEach((section, idx) => {
    const tab = document.createElement('div');
    tab.className = 'section-tab' + (idx === 0 ? ' active' : '');
    tab.textContent = section.name;
    tab.addEventListener('click', () => switchSection(idx));
    sectionTabsContainer.appendChild(tab);
  });
  updateProgressBar();
}

function startSectionTimer(sectionIdx) {
  clearInterval(timerInterval);
  timeRemaining = sections[sectionIdx].time * 60;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      if (sectionIdx < sections.length - 1) {
        switchSection(sectionIdx + 1);
      } else {
        endTest();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  testTimer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  if (timeRemaining < 60) {
    testTimer.classList.add('text-danger');
  } else {
    testTimer.classList.remove('text-danger');
  }
}

function showQuestion(sectionIdx, questionIdx) {
  currentSectionIndex = sectionIdx;
  currentQuestionIndex = questionIdx;
  const section = sections[sectionIdx];
  const question = section.questions[questionIdx];
  currentSectionName.textContent = section.name;
  prevBtn.disabled = sectionIdx === 0 && questionIdx === 0;
  nextBtn.textContent = (questionIdx === section.questionsCount - 1 && sectionIdx === sections.length - 1) ? 'Finish' : 'Next';
  questionsContainerUI.innerHTML = `
    <div class="card question-card">
      <div class="card-body">
        <div class="d-flex align-items-center mb-4">
          <div class="question-number">${questionIdx + 1}</div>
          <h5 class="card-title mb-0">${question.text}</h5>
        </div>
        <div class="options-container">
          ${question.options.map((opt, oi) => `
            <div class="option ${answers[sectionIdx][questionIdx] === oi ? 'selected' : ''}" data-option="${oi}">${opt}</div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  const options = questionsContainerUI.querySelectorAll('.option');
  options.forEach(option => {
    option.addEventListener('click', () => {
      options.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      answers[sectionIdx][questionIdx] = parseInt(option.dataset.option);
      updateProgressBar();
    });
  });
  updateSectionTabs();
}

function updateSectionTabs() {
  const tabs = sectionTabsContainer.querySelectorAll('.section-tab');
  tabs.forEach((tab, idx) => {
    if (idx === currentSectionIndex) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

function updateProgressBar() {
  let total = 0, answered = 0;
  for (const s in answers) for (const q in answers[s]) {
    total++;
    if (answers[s][q] !== null) answered++;
  }
  const progress = (answered / Math.max(1, total)) * 100;
  progressBar.style.width = `${progress}%`;
  progressBar.setAttribute('aria-valuenow', progress);
}

function showNextQuestion() {
  const section = sections[currentSectionIndex];
  if (currentQuestionIndex < section.questionsCount - 1) {
    showQuestion(currentSectionIndex, currentQuestionIndex + 1);
  } else if (currentSectionIndex < sections.length - 1) {
    switchSection(currentSectionIndex + 1, 0);
  } else {
    endTest();
  }
}
function showPreviousQuestion() {
  if (currentQuestionIndex > 0) {
    showQuestion(currentSectionIndex, currentQuestionIndex - 1);
  } else if (currentSectionIndex > 0) {
    const prevSection = sections[currentSectionIndex - 1];
    switchSection(currentSectionIndex - 1, prevSection.questions.length - 1);
  }
}
function switchSection(sectionIdx, questionIdx = 0) {
  startSectionTimer(sectionIdx);
  showQuestion(sectionIdx, questionIdx);
}

function endTest() {
  clearInterval(timerInterval);
  let correct = 0, incorrect = 0, skipped = 0;
  sections.forEach((section, sidx) => {
    section.questions.forEach((q, qidx) => {
      if (answers[sidx][qidx] === null) skipped++;
      else if (answers[sidx][qidx] === section.questions[qidx].correctAnswer) correct++;
      else incorrect++;
    });
  });
  correctAnswersEl.textContent = correct;
  incorrectAnswersEl.textContent = incorrect;
  skippedQuestionsEl.textContent = skipped;
  resultsDetails.innerHTML = '';
  sections.forEach((section, sidx) => {
    let html = `<h4 class="mt-4">${section.name}</h4>
    <div class="table-responsive"><table class="table table-bordered"><thead><tr>
    <th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Status</th></tr></thead><tbody>`;
    section.questions.forEach((q, qidx) => {
      const userAns = answers[sidx][qidx];
      let status = 'Skipped', statusClass = 'text-warning', uaText = 'Skipped';
      if (userAns !== null) {
        uaText = `${String.fromCharCode(65 + userAns)}: ${q.options[userAns] || ''}`;
        if (userAns === q.correctAnswer) {
          status = 'Correct'; statusClass = 'text-success';
        } else {
          status = 'Incorrect'; statusClass = 'text-danger';
        }
      }
      html += `<tr>
        <td>Q${qidx + 1}</td>
        <td>${uaText}</td>
        <td>${String.fromCharCode(65 + q.correctAnswer)}: ${q.options[q.correctAnswer] || ''}</td>
        <td class="${statusClass}">${status}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    resultsDetails.innerHTML += html;
  });
  testScreen.classList.add('d-none');
  resultsScreen.classList.remove('d-none');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  document.removeEventListener('keydown', preventTabSwitch);
}

function toggleDarkMode() {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  toggleModeBtn.textContent = darkMode ? 'Light Mode' : 'Dark Mode';
}
function preventTabSwitch(e) {
  if (e.key === 'Tab') e.preventDefault();
}
function backToSetup() {
  resultsScreen.classList.add('d-none');
  setupScreen.classList.remove('d-none');
  testStarted = false;
  sections = [];
  answers = {};
}

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Test Results', 14, 22);
  doc.setFontSize(12);
  let y = 32;
  doc.text('Correct Answers: ' + correctAnswersEl.textContent, 14, y);
  y += 8;
  doc.text('Incorrect Answers: ' + incorrectAnswersEl.textContent, 14, y);
  y += 8;
  doc.text('Skipped Questions: ' + skippedQuestionsEl.textContent, 14, y);
  y += 12;
  sections.forEach((section, sidx) => {
    doc.setFontSize(14);
    doc.text(section.name, 14, y);
    y += 7;
    doc.setFontSize(11);
    section.questions.forEach((q, qidx) => {
      const userAns = answers[sidx][qidx];
      const ua = (userAns === null) ? 'Skipped' : `${String.fromCharCode(65 + userAns)}: ${q.options[userAns] || ''}`;
      const ca = `${String.fromCharCode(65 + q.correctAnswer)}: ${q.options[q.correctAnswer] || ''}`;
      doc.text(`Q${qidx + 1}: ${q.text}`, 14, y);
      y += 6;
      doc.text(`   Your Answer: ${ua}`, 20, y);
      y += 6;
      doc.text(`   Correct Answer: ${ca}`, 20, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    y += 4;
  });
  doc.save('test_results.pdf');
}
