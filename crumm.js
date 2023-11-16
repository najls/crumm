const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('clear')) {
    localStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
    document.getElementById('question').innerText = 'Cleared local storage!';
}

// hide toolbar in safari
window.addEventListener('load', function() {
    setTimeout(function() {
        // This hides the address bar:
        window.scrollTo(0, 1);
    }, 0);
});

document.getElementById('toolbarFix').remove();

var resetBtn = document.getElementById('reset');
var orderBtn = document.getElementById('order');
var revealBtn = document.getElementById('reveal');
var renderReadBtn = document.getElementById('renderReader');

var questionOrder = -1; // -1, 0 and 1 for random, ascending and descending respectively
var revealBtnDisabled = true;

if (!window.localStorage.getItem('consent')) {
    disableUi();

    document.getElementById('consent').addEventListener('click', function() {
        window.localStorage.setItem('consent', 'true');
        document.getElementById('notice').classList.add('display-none');
        enableUi();
    }, {once: true });
}
else document.getElementById('notice').classList.add('display-none');

const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    rememberLastUsedCamera: true,
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
};

const html5QrCode = new Html5Qrcode("reader");
const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    try { stopCamera(renderReadBtn); }
    catch (err) { console.log(err); }
    renderReadBtn.setAttribute('aria-label', renderReadBtn.dataset.open);
    readerContainer.classList.add('display-none');
    loadQuestion(decodedText);
};

var readerContainer = document.getElementById('reader');
renderReadBtn.addEventListener('click', async function() {
    if (readerContainer.classList.toggle('display-none')) {
        try { stopCamera(this); }
        catch (err) { console.log(err); }
        renderReadBtn.setAttribute('aria-label', renderReadBtn.dataset.open);
    }
    else {
        this.disabled = true;

        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback).then(() => {
            if (html5QrCode.getState() === 2) {
                renderReadBtn.setAttribute('aria-label', renderReadBtn.dataset.close);
                this.disabled = false;
                window.scrollTo(0, 0);
            }
        })
        .catch((err) => {
            console.log(err);
            readerContainer.classList.add('display-none')
            this.disabled = false;
        });
    }
});

resetBtn.addEventListener('click', function() {
    disableUi();

    let noticeElem = document.getElementById('notice');
    let okBtn = document.getElementById('consent');
    let cancelBtn = document.getElementById('cancel');

    cancelBtn.addEventListener('click', function() {
        noticeElem.classList.add('display-none');
        enableUi();
    });

    okBtn.addEventListener('click', function() {
        clearGameData();

        noticeElem.classList.add('display-none');
        document.getElementById('title').classList.add('display-none');

        let ansElem = document.getElementById('alternatives');
        while (ansElem.firstChild) ansElem.removeChild(ansElem.firstChild);

        document.getElementById('question').innerText = "Erased game data!";

        revealBtnDisabled = true;
        enableUi();
    });

    cancelBtn.classList.remove('display-none');
    noticeElem.children[0].innerText = noticeElem.dataset.warning;
    noticeElem.classList.remove('display-none');
});

orderBtn.addEventListener('click', function() {
    let keys = ['ascn', 'desc', 'rand'];

    this.children[questionOrder + 1].classList.add('display-none');

    questionOrder = questionOrder > 0 ? -1 : questionOrder + 1;

    this.setAttribute('aria-label', this.dataset[keys[questionOrder + 1]]);
    this.children[questionOrder + 1].classList.remove('display-none');
});

revealBtn.addEventListener('click', function() {
    document.getElementById('answer').classList.add('revealed');
    this.disabled = true;
});

function stopCamera(btn) {
    btn.disabled = true;

    html5QrCode.stop().then(() => {
        html5QrCode.clear();
        btn.disabled = false;
    })
    .catch((err) => {
        console.log(err);
        btn.disabled = false;
    });
}

async function loadQuestion(url) {
    const response = await fetch(url);
    const collData = await response.json();

    let storageData = JSON.parse(localStorage.getItem(url));

    if (!storageData) {
        localStorage.setItem(url, JSON.stringify({
            'draw': [...Array(collData.questions.length).keys()] // draw card pile
        }));

        storageData = JSON.parse(localStorage.getItem(url));
    }

    let question = getQuestion(collData, url, storageData);
    renderQuestion(question, collData.title);
}

async function renderQuestion(question, title) {
    let titleElem = document.getElementById('title');

    if (title) {
        titleElem.innerText = title;
        titleElem.classList.remove('display-none');
    }
    else titleElem.classList.add('display-none');

    let qnElem = document.getElementById('question');
    qnElem.innerText = question.text;

    if (question.text.length > 100) qnElem.classList.add('long');
    else qnElem.classList.remove('long');

    let ansLen = 0;
    let ansElem = document.getElementById('alternatives');
    while (ansElem.firstChild) ansElem.removeChild(ansElem.firstChild);

    for (let i = 0; i < question.alternatives.length; i++) {
        let li = document.createElement('li');

        let text = document.createTextNode(question.alternatives[i].text);
        li.append(text);
        ansLen += text.length;

        if (i + 1 == question.answer) li.setAttribute('id', 'answer');
        ansElem.appendChild(li);
    }

    if (ansLen > 100) ansElem.classList.add('long');
    else ansElem.classList.remove('long');

    revealBtn.disabled = false;
}

function getQuestion(collData, key, storageData) {
    if (!storageData.draw.length) storageData.draw = [...Array(collData.questions.length).keys()];

    let i = questionOrder < 0 ?
        Math.floor(Math.random() * storageData.draw.length) :
        questionOrder > 0 ?
            storageData.draw.length - 1 :
            0;

    let n = storageData.draw[i];

    storageData.draw.splice(i, 1);
    localStorage.setItem(key, JSON.stringify(storageData));
    return collData.questions[n];
}

function disableUi() {
    revealBtnDisabled = revealBtn.disabled;

    resetBtn.disabled = true;
    orderBtn.disabled = true;
    revealBtn.disabled = true;
    renderReadBtn.disabled = true;
}

function enableUi() {
    revealBtn.disabled = revealBtnDisabled;

    resetBtn.disabled = false;
    orderBtn.disabled = false;
    renderReadBtn.disabled = false;
}

function clearGameData() {
    // https://stackoverflow.com/a/24552599
    var arr = [];

    for (let i = 0; i < localStorage.length; i++){
        if (localStorage.key(i).substring(0, 4) === 'http') {
            arr.push(localStorage.key(i));
        }
    }

    for (let i = 0; i < arr.length; i++) {
        localStorage.removeItem(arr[i]);
    }
}
