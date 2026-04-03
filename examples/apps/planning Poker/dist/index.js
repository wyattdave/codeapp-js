import { createItem, listItems, updateItem, getItem, deleteItem } from './dataverse.js';

/* ═══════════════════════════════════════════
   Planning Poker — Main Application Logic
   ═══════════════════════════════════════════ */

// ── Table & Key Constants ──────────────────
const S_TBL_SESSION = 'wd_pokersessions';
const S_TBL_PARTICIPANT = 'wd_pokerparticipants';
const S_TBL_ROUND = 'wd_pokerrounds';
const S_TBL_VOTE = 'wd_pokervotes';
const S_PK_SESSION = 'wd_pokersessionid';
const S_PK_PARTICIPANT = 'wd_pokerparticipantid';
const S_PK_ROUND = 'wd_pokerroundid';
const S_PK_VOTE = 'wd_pokervoteid';

// ── Card Values (Fibonacci + specials) ─────
const A_CARD_VALUES = [
  { sValue: '0', sDisplay: '0' },
  { sValue: '1', sDisplay: '1' },
  { sValue: '2', sDisplay: '2' },
  { sValue: '3', sDisplay: '3' },
  { sValue: '5', sDisplay: '5' },
  { sValue: '8', sDisplay: '8' },
  { sValue: '13', sDisplay: '13' },
  { sValue: '21', sDisplay: '21' },
  { sValue: '34', sDisplay: '34' },
  { sValue: '?', sDisplay: '?' },
  { sValue: 'coffee', sDisplay: '\u2615' },
  { sValue: 'infinity', sDisplay: '\u221E' }
];

// ── App State ──────────────────────────────
let sSessionId = '';
let sSessionCode = '';
let sSessionName = '';
let sParticipantId = '';
let sDisplayName = '';
let bIsOwner = false;
let sCurrentRoundId = '';
let sCurrentRoundIdentifier = '';
let sCurrentRoundDescription = '';
let sSelectedCard = '';
let bHasVoted = false;
let iCurrentRoundStatus = -1;
let iPollInterval = null;
let aParticipants = [];
let aCurrentVotes = [];
let sDismissedRoundId = '';

// ── DOM References ─────────────────────────
let eViewWelcome, eViewSession, eViewResults;
let eSessionInfo, eSessionBadge, eSessionNameText, eParticipantsCount, eVoteStatus;
let eNewRoundPanel, eWaitingPanel, eActiveRoundPanel;
let eRoundBadge, eRoundTitle, eRoundDescription;
let eParticipantsStrip, eCardHand, eCardSection;
let eBtnSubmit, eBtnReveal, eVotedMessage, eVoteActions;
let eResultsBadge, eResultsTitle, eStatAverage, eStatMedian, eVotesGrid;
let eBtnNewRound, eBtnWaitingNext;
let eFooterInfo, eErrorMessage;
let eBtnEndSession, eBtnShare;
let ePreviousRoundsPanel, ePreviousRoundsBody;
let aPreviousRounds = [];
let sSortCol = '';
let sSortDir = '';

function cacheDomElements() {
  eViewWelcome = document.getElementById('view-welcome');
  eViewSession = document.getElementById('view-session');
  eViewResults = document.getElementById('view-results');

  eSessionInfo = document.getElementById('session-info');
  eSessionBadge = document.getElementById('session-badge');
  eSessionNameText = document.getElementById('session-name-text');
  eParticipantsCount = document.getElementById('participants-count');
  eVoteStatus = document.getElementById('vote-status');

  eNewRoundPanel = document.getElementById('new-round-panel');
  eWaitingPanel = document.getElementById('waiting-panel');
  eActiveRoundPanel = document.getElementById('active-round-panel');

  eRoundBadge = document.getElementById('round-badge');
  eRoundTitle = document.getElementById('round-title');
  eRoundDescription = document.getElementById('round-description');

  eParticipantsStrip = document.getElementById('participants-strip');
  eCardHand = document.getElementById('card-hand');
  eCardSection = document.getElementById('card-section');

  eBtnSubmit = document.getElementById('btn-submit');
  eBtnReveal = document.getElementById('btn-reveal');
  eVotedMessage = document.getElementById('voted-message');
  eVoteActions = document.getElementById('vote-actions');

  eResultsBadge = document.getElementById('results-badge');
  eResultsTitle = document.getElementById('results-title');
  eStatAverage = document.getElementById('stat-average');
  eStatMedian = document.getElementById('stat-median');
  eVotesGrid = document.getElementById('votes-grid');

  eBtnNewRound = document.getElementById('btn-new-round');
  eBtnWaitingNext = document.getElementById('btn-waiting-next');

  eFooterInfo = document.getElementById('footer-info');
  eErrorMessage = document.getElementById('error-message');
  eBtnEndSession = document.getElementById('btn-end-session');
  eBtnShare = document.getElementById('btn-share');
  ePreviousRoundsPanel = document.getElementById('previous-rounds-panel');
  ePreviousRoundsBody = document.getElementById('previous-rounds-body');
}

// ── Boot ───────────────────────────────────
async function boot() {
  cacheDomElements();
  setupEventListeners();
  renderCardHand();

  // Resume session from storage if available
  const sStoredSession = sessionStorage.getItem('pp_sessionId');
  const sStoredParticipant = sessionStorage.getItem('pp_participantId');

  if (sStoredSession && sStoredParticipant) {
    try {
      const oSession = await getItem(S_TBL_SESSION, S_PK_SESSION, sStoredSession);
      if (oSession && oSession.wd_isactive) {
        const oParticipant = await getItem(S_TBL_PARTICIPANT, S_PK_PARTICIPANT, sStoredParticipant);
        if (!oParticipant || !oParticipant[S_PK_PARTICIPANT]) {
          throw new Error('Participant not found');
        }
        sSessionId = sStoredSession;
        sParticipantId = sStoredParticipant;
        bIsOwner = !!(oSession._createdby_value && oParticipant._createdby_value && oSession._createdby_value === oParticipant._createdby_value);
        sSessionCode = oSession.wd_sessioncode;
        sSessionName = oSession.wd_name;
        sDisplayName = sessionStorage.getItem('pp_displayName') || '';
        enterSession();
        return;
      }
    } catch (oErr) {
      clearSessionStorage();
    }
  }

  // Check for ?session= param in URL
  var oParams = new URLSearchParams(window.location.search);
  var sJoinCode = oParams.get('session');
  if (sJoinCode) {
    document.getElementById('inp-join-code').value = sJoinCode.toUpperCase();
    document.getElementById('inp-join-name').focus();
  }

  showView('welcome');
  loadPreviousRounds();
}

// ── View Management ────────────────────────
function showView(sView) {
  eViewWelcome.style.display = sView === 'welcome' ? '' : 'none';
  eViewSession.style.display = sView === 'session' ? '' : 'none';
  eViewResults.style.display = sView === 'results' ? '' : 'none';

  if (sView === 'welcome') {
    eSessionInfo.style.display = 'none';
    eParticipantsCount.style.display = 'none';
  }
}

async function enterSession() {
  showView('session');
  updateHeaderForSession();

  // Hide all sub-panels — pollSessionState will show the correct one
  eActiveRoundPanel.style.display = 'none';
  eNewRoundPanel.style.display = 'none';
  eWaitingPanel.style.display = 'none';

  await pollSessionState();

  // Fallback: if poll failed silently and no panel was shown, show defaults
  if (eActiveRoundPanel.style.display === 'none' &&
      eNewRoundPanel.style.display === 'none' &&
      eWaitingPanel.style.display === 'none' &&
      eViewResults.style.display === 'none') {
    if (bIsOwner) {
      eNewRoundPanel.style.display = '';
    } else {
      eWaitingPanel.style.display = '';
    }
  }

  stopPolling();
  iPollInterval = setInterval(pollSessionState, 3000);
}

function updateHeaderForSession() {
  eSessionInfo.style.display = '';
  eSessionBadge.textContent = sSessionCode;
  eSessionNameText.textContent = sSessionName;
  eParticipantsCount.style.display = '';
  document.getElementById('btn-leave').style.display = '';
  eBtnShare.style.display = '';
  eBtnEndSession.style.display = bIsOwner ? '' : 'none';
  eFooterInfo.textContent = 'Session: ' + sSessionName + ' \u2022 Code: ' + sSessionCode;
}

// ── Event Listeners ────────────────────────
function setupEventListeners() {
  document.getElementById('btn-create').addEventListener('click', handleCreateSession);
  document.getElementById('btn-join').addEventListener('click', handleJoinSession);
  document.getElementById('btn-start-round').addEventListener('click', handleStartRound);
  document.getElementById('btn-leave').addEventListener('click', handleLeaveSession);
  eBtnEndSession.addEventListener('click', handleEndSession);
  eBtnShare.addEventListener('click', handleShareSession);

  eCardHand.addEventListener('click', (oEvent) => {
    const eTarget = oEvent.target.closest('.poker-card');
    if (eTarget && !bHasVoted) {
      selectCard(eTarget);
    }
  });

  eBtnSubmit.addEventListener('click', handleSubmitVote);
  eBtnReveal.addEventListener('click', handleRevealVotes);
  eBtnNewRound.addEventListener('click', handleNewRound);
}

// ── Card Rendering & Selection ─────────────
function renderCardHand() {
  let sHtml = '';
  A_CARD_VALUES.forEach((oCard) => {
    const sSpecial = (oCard.sValue === '?' || oCard.sValue === 'coffee' || oCard.sValue === 'infinity') ? ' special' : '';
    sHtml = sHtml + '<div class="poker-card' + sSpecial + '" data-value="' + escapeAttr(oCard.sValue) + '">' + escapeHtml(oCard.sDisplay) + '</div>';
  });
  eCardHand.innerHTML = sHtml;
}

function selectCard(eCard) {
  const aCards = eCardHand.querySelectorAll('.poker-card');
  aCards.forEach((eC) => {
    eC.classList.remove('selected');
  });
  eCard.classList.add('selected');
  sSelectedCard = eCard.getAttribute('data-value');
  eBtnSubmit.disabled = false;
}

// ── Find or Create Participant (upsert) ────
async function findOrCreateParticipant(sTargetSessionId, sUserName) {
  // Create a participant so we can identify the current user via _createdby_value
  const oNewParticipant = await createItem(S_TBL_PARTICIPANT, S_PK_PARTICIPANT, {
    'wd_session@odata.bind': '/' + S_TBL_SESSION + '(' + sTargetSessionId + ')',
    wd_newcolumn: sUserName,
    wd_initials: getInitials(sUserName)
  });
  const sNewId = oNewParticipant[S_PK_PARTICIPANT];

  // Read it back to get the system _createdby_value
  const oFull = await getItem(S_TBL_PARTICIPANT, S_PK_PARTICIPANT, sNewId);
  const sUserId = oFull._createdby_value;

  if (!sUserId) {
    return sNewId;
  }

  // Check if this user already had a participant in this session
  const oExisting = await listItems(S_TBL_PARTICIPANT, S_PK_PARTICIPANT, {
    filter: '_wd_session_value eq ' + sTargetSessionId
  });
  const aOthers = (oExisting.entities || []).filter(function(oP) {
    return oP._createdby_value === sUserId && oP[S_PK_PARTICIPANT] !== sNewId;
  });

  if (aOthers.length > 0) {
    // Keep the original participant (it has votes linked to it), update its name
    const oKeep = aOthers[0];
    await updateItem(S_TBL_PARTICIPANT, S_PK_PARTICIPANT, oKeep[S_PK_PARTICIPANT], {
      wd_newcolumn: sUserName,
      wd_initials: getInitials(sUserName)
    });
    // Remove the duplicate we just created
    try { await deleteItem(S_TBL_PARTICIPANT, S_PK_PARTICIPANT, sNewId); } catch (e) { /* non-critical */ }
    return oKeep[S_PK_PARTICIPANT];
  }

  return sNewId;
}

// ── Create Session ─────────────────────────
async function handleCreateSession() {
  const sName = document.getElementById('inp-session-name').value.trim();
  const sCode = document.getElementById('inp-session-code').value.trim().toUpperCase();
  const sUserName = document.getElementById('inp-create-name').value.trim();

  if (sName === '' || sCode === '' || sUserName === '') {
    showError('Please fill in all fields');
    return;
  }

  try {
    const oSession = await createItem(S_TBL_SESSION, S_PK_SESSION, {
      wd_name: sName,
      wd_sessioncode: sCode,
      wd_isactive: true
    });

    sSessionId = oSession[S_PK_SESSION];
    sSessionCode = sCode;
    sSessionName = sName;
    sDisplayName = sUserName;
    bIsOwner = true;

    sParticipantId = await findOrCreateParticipant(sSessionId, sUserName);
    saveSessionStorage();
    enterSession();
  } catch (oErr) {
    showError('Create session: ' + (oErr.message || oErr));
  }
}

// ── Join Session ───────────────────────────
async function handleJoinSession() {
  const sCode = document.getElementById('inp-join-code').value.trim().toUpperCase();
  const sUserName = document.getElementById('inp-join-name').value.trim();

  if (sCode === '' || sUserName === '') {
    showError('Please fill in all fields');
    return;
  }

  try {
    const oResult = await listItems(S_TBL_SESSION, S_PK_SESSION, {
      filter: 'wd_sessioncode eq \'' + sCode + '\' and wd_isactive eq true'
    });

    if (!oResult.entities || oResult.entities.length === 0) {
      showError('Session not found. Check the code and try again.');
      return;
    }

    const oSession = oResult.entities[0];
    sSessionId = oSession[S_PK_SESSION];
    sSessionCode = oSession.wd_sessioncode;
    sSessionName = oSession.wd_name;
    sDisplayName = sUserName;

    sParticipantId = await findOrCreateParticipant(sSessionId, sUserName);

    // Determine ownership by comparing session creator with current user
    const oParticipantFull = await getItem(S_TBL_PARTICIPANT, S_PK_PARTICIPANT, sParticipantId);
    bIsOwner = !!(oSession._createdby_value && oParticipantFull._createdby_value && oSession._createdby_value === oParticipantFull._createdby_value);

    saveSessionStorage();
    enterSession();
  } catch (oErr) {
    showError('Join session: ' + (oErr.message || oErr));
  }
}

// ── Start Round ────────────────────────────
async function handleStartRound() {
  const sRoundId = document.getElementById('inp-round-id').value.trim();
  const sDesc = document.getElementById('inp-round-desc').value.trim();

  if (sRoundId === '') {
    showError('Please enter a round ID');
    return;
  }

  try {
    const oRound = await createItem(S_TBL_ROUND, S_PK_ROUND, {
      'wd_session@odata.bind': '/' + S_TBL_SESSION + '(' + sSessionId + ')',
      wd_roundidentifier: sRoundId,
      wd_description: sDesc,
      wd_newcolumn: '0'
    });

    sCurrentRoundId = oRound[S_PK_ROUND];
    sCurrentRoundIdentifier = sRoundId;
    sCurrentRoundDescription = sDesc;
    iCurrentRoundStatus = 0;
    bHasVoted = false;
    sSelectedCard = '';
    aCurrentVotes = [];

    document.getElementById('inp-round-id').value = '';
    document.getElementById('inp-round-desc').value = '';

    showActiveRound();
  } catch (oErr) {
    showError('Start round: ' + (oErr.message || oErr));
  }
}

function showActiveRound() {
  eNewRoundPanel.style.display = 'none';
  eWaitingPanel.style.display = 'none';
  eActiveRoundPanel.style.display = '';

  eRoundBadge.textContent = sCurrentRoundIdentifier;
  eRoundTitle.textContent = sCurrentRoundDescription || sCurrentRoundIdentifier;
  eRoundDescription.textContent = sCurrentRoundDescription;

  // Reset voting UI
  eCardSection.style.display = '';
  eVoteActions.style.display = '';
  eVotedMessage.style.display = 'none';
  eBtnSubmit.style.display = '';
  eBtnSubmit.disabled = true;
  eBtnSubmit.textContent = 'Submit Vote';
  eBtnReveal.style.display = bIsOwner ? '' : 'none';

  // Reset card selection
  const aCards = eCardHand.querySelectorAll('.poker-card');
  aCards.forEach((eC) => {
    eC.classList.remove('selected');
  });
  sSelectedCard = '';
  bHasVoted = false;
}

// ── Submit Vote ────────────────────────────
async function handleSubmitVote() {
  if (sSelectedCard === '' || bHasVoted) {
    return;
  }

  try {
    // Check for an existing vote by this participant in this round
    const oExistingVotes = await listItems(S_TBL_VOTE, S_PK_VOTE, {
      filter: '_wd_round_value eq ' + sCurrentRoundId + ' and _wd_participant_value eq ' + sParticipantId
    });

    if (oExistingVotes.entities && oExistingVotes.entities.length > 0) {
      // Update existing vote
      await updateItem(S_TBL_VOTE, S_PK_VOTE, oExistingVotes.entities[0][S_PK_VOTE], {
        wd_score: sSelectedCard
      });
    } else {
      // Create new vote
      await createItem(S_TBL_VOTE, S_PK_VOTE, {
        'wd_round@odata.bind': '/' + S_TBL_ROUND + '(' + sCurrentRoundId + ')',
        'wd_participant@odata.bind': '/' + S_TBL_PARTICIPANT + '(' + sParticipantId + ')',
        wd_score: sSelectedCard
      });
    }

    bHasVoted = true;
    eCardSection.style.display = 'none';
    eVoteActions.style.display = bIsOwner ? '' : 'none';
    eVotedMessage.style.display = '';
    eBtnSubmit.style.display = 'none';
  } catch (oErr) {
    showError('Submit vote: ' + (oErr.message || oErr));
  }
}

// ── Reveal Votes ───────────────────────────
async function handleRevealVotes() {
  if (!bIsOwner) return;

  try {
    const oVoteResult = await listItems(S_TBL_VOTE, S_PK_VOTE, {
      filter: '_wd_round_value eq ' + sCurrentRoundId
    });
    aCurrentVotes = oVoteResult.entities || [];

    const oStats = calculateStats(aCurrentVotes);

    await updateItem(S_TBL_ROUND, S_PK_ROUND, sCurrentRoundId, {
      wd_newcolumn: '1',
      wd_averagescore: oStats.iAverage,
      wd_medianscore: oStats.iMedian
    });

    iCurrentRoundStatus = 1;
    showResults(aCurrentVotes, oStats);
  } catch (oErr) {
    showError('Reveal votes: ' + (oErr.message || oErr));
  }
}

// ── New Round ──────────────────────────────
function handleNewRound() {
  sDismissedRoundId = sCurrentRoundId;
  sCurrentRoundId = '';
  sCurrentRoundIdentifier = '';
  sCurrentRoundDescription = '';
  iCurrentRoundStatus = -1;
  bHasVoted = false;
  sSelectedCard = '';
  aCurrentVotes = [];

  showView('session');
  updateHeaderForSession();
  eActiveRoundPanel.style.display = 'none';

  if (bIsOwner) {
    eNewRoundPanel.style.display = '';
    eWaitingPanel.style.display = 'none';
  } else {
    eNewRoundPanel.style.display = 'none';
    eWaitingPanel.style.display = '';
  }
}

// ── Results Display ────────────────────────
function showResults(aVotes, oStats) {
  showView('results');
  updateHeaderForSession();

  eResultsBadge.textContent = sCurrentRoundIdentifier;
  eResultsTitle.textContent = sCurrentRoundDescription || sCurrentRoundIdentifier;
  eStatAverage.textContent = oStats.iAverage !== null ? oStats.iAverage.toFixed(1) : '\u2014';
  eStatMedian.textContent = oStats.iMedian !== null ? oStats.iMedian.toFixed(1) : '\u2014';

  let sHtml = '';
  aVotes.forEach((oVote) => {
    const oParticipant = aParticipants.find((oP) => oP[S_PK_PARTICIPANT] === oVote._wd_participant_value);
    const sName = oParticipant ? oParticipant.wd_newcolumn : 'Unknown';
    const sInitials = oParticipant ? oParticipant.wd_initials : '??';
    const sScore = formatScoreDisplay(oVote.wd_score);

    sHtml = sHtml + '<div class="vote-card">' +
      '<div class="vote-card-avatar">' + escapeHtml(sInitials) + '</div>' +
      '<div class="vote-card-info">' +
        '<span class="vote-card-name">' + escapeHtml(sName) + '</span>' +
        '<span class="vote-card-value">' + escapeHtml(sScore) + '</span>' +
      '</div>' +
    '</div>';
  });
  eVotesGrid.innerHTML = sHtml;

  if (bIsOwner) {
    eBtnNewRound.style.display = '';
    eBtnWaitingNext.style.display = 'none';
  } else {
    eBtnNewRound.style.display = 'none';
    eBtnWaitingNext.style.display = '';
  }
}

// ── Polling ────────────────────────────────
function startPolling() {
  stopPolling();
  pollSessionState();
  iPollInterval = setInterval(pollSessionState, 3000);
}

function stopPolling() {
  if (iPollInterval) {
    clearInterval(iPollInterval);
    iPollInterval = null;
  }
}

// Determine if a round is still open (no results yet)
function isRoundOpen(oRound) {
  // A round is revealed if it has average/median scores OR wd_newcolumn status is '1'
  if (oRound.wd_averagescore != null) return false;
  if (oRound.wd_medianscore != null) return false;
  if (String(oRound.wd_newcolumn) === '1') return false;
  return true;
}

async function pollSessionState() {
  try {
    // Fetch participants
    const oParticipantResult = await listItems(S_TBL_PARTICIPANT, S_PK_PARTICIPANT, {
      filter: '_wd_session_value eq ' + sSessionId
    });
    aParticipants = oParticipantResult.entities || [];

    // Fetch ALL rounds for this session
    const oRoundResult = await listItems(S_TBL_ROUND, S_PK_ROUND, {
      filter: '_wd_session_value eq ' + sSessionId
    });
    const aAllSessionRounds = oRoundResult.entities || [];

    // Sort by createdon descending so we always pick the most recent
    aAllSessionRounds.sort(function (a, b) {
      return new Date(b.createdon) - new Date(a.createdon);
    });

    // Split into open rounds (no average/median) and revealed rounds
    // Because the array is sorted newest-first, the first match is the most recent
    var oOpenRound = null;
    var oRevealedRound = null;

    for (var i = 0; i < aAllSessionRounds.length; i++) {
      var oR = aAllSessionRounds[i];
      if (isRoundOpen(oR)) {
        if (!oOpenRound) oOpenRound = oR;
      } else {
        if (!oRevealedRound) oRevealedRound = oR;
      }
    }

    // If a new open round appears, clear the dismissed marker
    if (oOpenRound) {
      sDismissedRoundId = '';
    }

    // Skip re-showing a revealed round the user already dismissed
    if (!oOpenRound && oRevealedRound && oRevealedRound[S_PK_ROUND] === sDismissedRoundId) {
      oRevealedRound = null;
    }

    // Prefer showing an open round; otherwise show the latest revealed round
    var oRound = oOpenRound || oRevealedRound;

    if (oRound) {
      var sRoundId = oRound[S_PK_ROUND];
      var bIsOpen = isRoundOpen(oRound);

      if (bIsOpen) {
        // ── Active voting round ──
        if (sRoundId !== sCurrentRoundId || iCurrentRoundStatus !== 0) {
          // New or re-discovered open round — set it up
          sCurrentRoundId = sRoundId;
          sCurrentRoundIdentifier = oRound.wd_roundidentifier || '';
          sCurrentRoundDescription = oRound.wd_description || '';
          iCurrentRoundStatus = 0;
          bHasVoted = false;
          sSelectedCard = '';
          aCurrentVotes = [];

          // Check if this user already voted (handles page refresh)
          try {
            var oExisting = await listItems(S_TBL_VOTE, S_PK_VOTE, {
              filter: '_wd_round_value eq ' + sCurrentRoundId + ' and _wd_participant_value eq ' + sParticipantId
            });
            if (oExisting.entities && oExisting.entities.length > 0) {
              bHasVoted = true;
            }
          } catch (oVoteErr) {
            console.error('Vote check error:', oVoteErr);
          }

          showView('session');
          updateHeaderForSession();
          showActiveRound();

          if (bHasVoted) {
            eCardSection.style.display = 'none';
            eVoteActions.style.display = bIsOwner ? '' : 'none';
            eVotedMessage.style.display = '';
            eBtnSubmit.style.display = 'none';
          }
        } else {
          // Same open round — just refresh vote counts
          var oVoteResult = await listItems(S_TBL_VOTE, S_PK_VOTE, {
            filter: '_wd_round_value eq ' + sCurrentRoundId
          });
          aCurrentVotes = oVoteResult.entities || [];
          renderParticipantStrip();
          updateVoteCount();
        }
      } else {
        // ── Revealed round (has average/median) ──
        if (sRoundId !== sCurrentRoundId || iCurrentRoundStatus !== 1) {
          sCurrentRoundId = sRoundId;
          sCurrentRoundIdentifier = oRound.wd_roundidentifier || '';
          sCurrentRoundDescription = oRound.wd_description || '';
          iCurrentRoundStatus = 1;

          var oVoteResult = await listItems(S_TBL_VOTE, S_PK_VOTE, {
            filter: '_wd_round_value eq ' + sCurrentRoundId
          });
          aCurrentVotes = oVoteResult.entities || [];

          var oStats = calculateStats(aCurrentVotes);
          showResults(aCurrentVotes, oStats);
        } else {
          renderParticipantStrip();
        }
      }
    } else {
      // No rounds at all — show waiting/new round panel
      if (eViewResults.style.display !== 'none') {
        // Stay on results view until owner starts new round
        renderParticipantStrip();
        return;
      }

      showView('session');
      updateHeaderForSession();
      eActiveRoundPanel.style.display = 'none';

      if (bIsOwner) {
        eNewRoundPanel.style.display = '';
        eWaitingPanel.style.display = 'none';
      } else {
        eNewRoundPanel.style.display = 'none';
        eWaitingPanel.style.display = '';
      }

      renderParticipantStrip();
    }
  } catch (oErr) {
    console.error('pollSessionState error:', oErr);
  }
}

// ── Render Participants ────────────────────
function renderParticipantStrip() {
  let sHtml = '';
  aParticipants.forEach((oP) => {
    const bVoted = aCurrentVotes.some((oV) => oV._wd_participant_value === oP[S_PK_PARTICIPANT]);
    const sVotedClass = bVoted ? 'voted' : 'waiting';
    const sOwnerClass = '';
    const sInitials = oP.wd_initials || '??';
    const sName = oP.wd_newcolumn || 'Unknown';

    sHtml = sHtml + '<div class="participant">' +
      '<div class="participant-avatar ' + sVotedClass + sOwnerClass + '">' + escapeHtml(sInitials) + '</div>' +
      '<span class="participant-name">' + escapeHtml(sName) + '</span>' +
    '</div>';
  });
  eParticipantsStrip.innerHTML = sHtml;
}

function updateVoteCount() {
  const iTotal = aParticipants.length;
  const iVoted = aCurrentVotes.length;
  eVoteStatus.textContent = iVoted + '/' + iTotal + ' voted';
}

// ── Statistics ─────────────────────────────
function calculateStats(aVotes) {
  const aNumeric = aVotes
    .map((oV) => parseFloat(oV.wd_score))
    .filter((iVal) => !isNaN(iVal));

  if (aNumeric.length === 0) {
    return { iAverage: null, iMedian: null };
  }

  const iSum = aNumeric.reduce((iAcc, iVal) => iAcc + iVal, 0);
  const iAverage = iSum / aNumeric.length;

  const aSorted = aNumeric.slice().sort((iA, iB) => iA - iB);
  const iMid = Math.floor(aSorted.length / 2);
  let iMedian;
  if (aSorted.length % 2 === 0) {
    iMedian = (aSorted[iMid - 1] + aSorted[iMid]) / 2;
  } else {
    iMedian = aSorted[iMid];
  }

  return { iAverage, iMedian };
}

// ── Utility Functions ──────────────────────
function getInitials(sName) {
  const aParts = sName.trim().split(new RegExp('\\s+'));
  if (aParts.length >= 2) {
    return (aParts[0][0] + aParts[aParts.length - 1][0]).toUpperCase();
  }
  return sName.substring(0, 2).toUpperCase();
}

function formatScoreDisplay(sScore) {
  if (sScore === 'coffee') return '\u2615';
  if (sScore === 'infinity') return '\u221E';
  return sScore;
}

function escapeHtml(sText) {
  const eDiv = document.createElement('div');
  eDiv.textContent = sText;
  return eDiv.innerHTML;
}

function escapeAttr(sText) {
  return sText.replace(new RegExp('&', 'g'), '&amp;')
    .replace(new RegExp('"', 'g'), '&quot;')
    .replace(new RegExp('<', 'g'), '&lt;')
    .replace(new RegExp('>', 'g'), '&gt;');
}

function showError(sMessage) {
  if (!eErrorMessage) return;
  eErrorMessage.textContent = sMessage;
  eErrorMessage.style.display = '';
  setTimeout(() => {
    eErrorMessage.style.display = 'none';
  }, 4000);
}
// ── Share Session ───────────────────────────
async function handleShareSession() {
  var oUrl = new URL(window.location.href);
  oUrl.searchParams.set('session', sSessionCode);
  try {
    await navigator.clipboard.writeText(oUrl.toString());
    eBtnShare.textContent = '\u2713 Copied!';
    setTimeout(function () { eBtnShare.textContent = '\uD83D\uDD17 Share'; }, 2000);
  } catch (oErr) {
    showError('Could not copy link');
  }
}
// ── End Session (Owner) ────────────────────
async function handleEndSession() {
  if (!bIsOwner) return;

  try {
    await updateItem(S_TBL_SESSION, S_PK_SESSION, sSessionId, {
      wd_isactive: false
    });
    handleLeaveSession();
  } catch (oErr) {
    showError('End session: ' + (oErr.message || oErr));
  }
}

// ── Leave Session ──────────────────────────
function handleLeaveSession() {
  stopPolling();
  clearSessionStorage();

  sSessionId = '';
  sSessionCode = '';
  sSessionName = '';
  sParticipantId = '';
  sDisplayName = '';
  bIsOwner = false;
  sCurrentRoundId = '';
  sCurrentRoundIdentifier = '';
  sCurrentRoundDescription = '';
  sSelectedCard = '';
  bHasVoted = false;
  iCurrentRoundStatus = -1;
  aParticipants = [];
  aCurrentVotes = [];
  sDismissedRoundId = '';

  document.getElementById('btn-leave').style.display = 'none';
  eBtnShare.style.display = 'none';
  eBtnEndSession.style.display = 'none';
  showView('welcome');
}

function saveSessionStorage() {
  sessionStorage.setItem('pp_sessionId', sSessionId);
  sessionStorage.setItem('pp_participantId', sParticipantId);
  sessionStorage.setItem('pp_displayName', sDisplayName);
}

function clearSessionStorage() {
  sessionStorage.removeItem('pp_sessionId');
  sessionStorage.removeItem('pp_participantId');
  sessionStorage.removeItem('pp_displayName');
}

// ── Previous Rounds Table ──────────────────
async function loadPreviousRounds() {
  try {
    var oRoundResult = await listItems(S_TBL_ROUND, S_PK_ROUND, {});
    var aAllRounds = oRoundResult.entities || [];
    var aRounds = aAllRounds.filter(function (oR) { return !isRoundOpen(oR); });
    if (aRounds.length === 0) {
      ePreviousRoundsPanel.style.display = 'none';
      return;
    }

    // Fetch session names for display
    var aSessionIds = [];
    aRounds.forEach(function (oR) {
      if (oR._wd_session_value && aSessionIds.indexOf(oR._wd_session_value) === -1) {
        aSessionIds.push(oR._wd_session_value);
      }
    });

    var oSessionMap = {};
    for (var i = 0; i < aSessionIds.length; i++) {
      try {
        var oSess = await getItem(S_TBL_SESSION, S_PK_SESSION, aSessionIds[i], [S_PK_SESSION, 'wd_name']);
        oSessionMap[aSessionIds[i]] = oSess.wd_name || 'Unknown';
      } catch (e) {
        oSessionMap[aSessionIds[i]] = 'Unknown';
      }
    }

    aPreviousRounds = aRounds.map(function (oR) {
      return {
        session: oSessionMap[oR._wd_session_value] || 'Unknown',
        roundName: oR.wd_roundidentifier || '',
        description: oR.wd_description || '',
        average: oR.wd_averagescore != null ? parseFloat(oR.wd_averagescore) : null,
        median: oR.wd_medianscore != null ? parseFloat(oR.wd_medianscore) : null
      };
    });

    renderPreviousRoundsTable();
    ePreviousRoundsPanel.style.display = '';
    setupSortButtons();
  } catch (oErr) {
    showError('Previous rounds: ' + (oErr.message || oErr));
  }
}

function renderPreviousRoundsTable() {
  var sHtml = '';
  aPreviousRounds.forEach(function (oRow) {
    sHtml += '<tr>' +
      '<td>' + escapeHtml(oRow.session) + '</td>' +
      '<td>' + escapeHtml(oRow.roundName) + '</td>' +
      '<td>' + escapeHtml(oRow.description) + '</td>' +
      '<td>' + (oRow.average !== null ? oRow.average.toFixed(1) : '\u2014') + '</td>' +
      '<td>' + (oRow.median !== null ? oRow.median.toFixed(1) : '\u2014') + '</td>' +
    '</tr>';
  });
  ePreviousRoundsBody.innerHTML = sHtml;
}

function setupSortButtons() {
  var aBtns = document.querySelectorAll('.sort-btn');
  aBtns.forEach(function (eBtn) {
    eBtn.addEventListener('click', function () {
      var sCol = eBtn.getAttribute('data-col');
      var sDir = eBtn.getAttribute('data-dir');
      var sNewDir = sDir === 'asc' ? 'desc' : 'asc';

      // Reset all buttons
      aBtns.forEach(function (eB) {
        eB.setAttribute('data-dir', '');
        eB.className = 'sort-btn';
      });

      eBtn.setAttribute('data-dir', sNewDir);
      eBtn.className = 'sort-btn ' + sNewDir;
      sSortCol = sCol;
      sSortDir = sNewDir;

      sortPreviousRounds();
      renderPreviousRoundsTable();
    });
  });
}

function sortPreviousRounds() {
  var iDir = sSortDir === 'desc' ? -1 : 1;
  aPreviousRounds.sort(function (oA, oB) {
    var vA = oA[sSortCol];
    var vB = oB[sSortCol];
    if (vA === null && vB === null) return 0;
    if (vA === null) return 1;
    if (vB === null) return -1;
    if (typeof vA === 'string') {
      return iDir * vA.localeCompare(vB);
    }
    return iDir * (vA - vB);
  });
}

boot();