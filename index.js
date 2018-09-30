window.addEventListener('load', function() {
	var VERBS = [];
	var bookmarks = (localStorage.getItem('verb-bookmarks') || '').split(',').filter(e => e != '');
	var session_results = [];
	var $audio = new Audio('correct.mp3');

	fetch('verbs.json')
		.then(response => response.json())
		.then(function (json) {
			VERBS = json;

			VERBS.verbs = VERBS.map(v => v.verb).filter((e, i, arr) => arr.indexOf(e) == i);
			VERBS.preps = VERBS.map(v => v.prep).filter((e, i, arr) => arr.indexOf(e) == i);

			document.querySelector('#loading').remove();
			document.querySelector('#button-play').style.display = 'block';	
		});

	var $score = document.querySelector('#score');
	var $definition = document.querySelector('#definition');
	var $answer = document.querySelector('#answer');
	var $verbs = document.querySelector('#verbs');
	var $preps = document.querySelector('#preps');

	document.querySelector('#button-play').addEventListener('click', () => setPage('game') || setVerb());
	document.querySelector('#button-help').addEventListener('click', () => setPage('help'));
	document.querySelector('#button-help-close').addEventListener('click', () => setPage('game'));

	document.querySelector('#button-option').addEventListener('click', function () {
		setPage('option');
		document.querySelector('#page-option').setAttribute('prev', getOption('verb-complexity'));
	});

	document.querySelector('#button-option-close').addEventListener('click', function () {
		setPage('game');
		if (document.querySelector('#page-option').getAttribute('prev') != getOption('verb-complexity'))
			setVerb();
	});

	document.querySelector('#button-bookmarks').addEventListener('click', function () {
		var $bookmarks = document.querySelector('#page-bookmarks #bookmarks');
		$bookmarks.innerHTML = '';

		bookmarks.forEach(function (id) {
			var verb = VERBS.find(v => v.id == id);
			if (!verb)
				return;

			var $e = document.createElement('div');
			$e.innerHTML = '<div id = "verb">{verb}</div><div id = "synonyms" title = "Synonyms">{synonyms}</div><div id = "definition">{definition}</div><div id = "examples">{examples}</div><div id = "remove">&#10006;</div>'
				.replace('{verb}', verb.verb + ' ' + verb.prep)
				.replace('{definition}', verb.definition)
				.replace('{synonyms}', verb.synonyms.join(', '))
				.replace('{examples}', verb.examples.map(e => '<span>' + e + '</span>').join(''));


			$e.querySelector('#verb').onclick = () => window.open('https://www.macmillandictionary.com/dictionary/british/' + verb.verb.replace(/ /g, '-'));
			$e.querySelector('#remove').onclick = () => bookmarks.remove(id) || $e.remove(); 

			$bookmarks.appendChild($e);
		})
		setPage('bookmarks');
	});
	document.querySelector('#button-bookmarks-close').addEventListener('click', () => setPage('game'));

	['verb-complexity', 'verb-list-length', 'verb-sound-enable'].forEach(function (opt) {
		var $e = document.querySelector('#' + opt);
		for(var i = 0; i < $e.children.length; i++)
			$e.children[i].addEventListener('click', (event) => setOption(opt, event.target.getAttribute('value')));
		setOption(opt, localStorage.getItem(opt));
	});

	function setOption(opt, value) {
		var $e = document.querySelector('#' + opt);
		localStorage.setItem(opt, value);
		for(var i = 0; i < $e.children.length; i++)
			$e.children[i].removeAttribute('current');

		var $curr = $e.querySelector('[value="' + value + '"]') || $e.querySelector('[value="' + $e.getAttribute('default') + '"]')
		$curr.setAttribute('current', true);
	}

	function getOption(opt) {
		var $e = document.querySelector('#' + opt + ' [current]');
		return $e ? $e.getAttribute('value') : document.querySelector('#' + opt).getAttribute('default');
	}

	bookmarks.add = function () {
		var id = $definition.getAttribute('answer');

		var $e = document.querySelector('#button-bookmarks');
		$e.setAttribute('animation', true);
		setTimeout(() => $e.removeAttribute('animation'), 1000);

		if (bookmarks.indexOf(id) != -1)
			return;

		bookmarks.push(id);	
		localStorage.setItem('verb-bookmarks', bookmarks.join(','));
	}

	bookmarks.remove = function (id) {
		var idx = bookmarks.indexOf(id + '');
		if (idx == -1) 
			return;

		bookmarks.splice(idx, 1);
		localStorage.setItem('verb-bookmarks', bookmarks.join(','));
	}

	$definition.addEventListener('click', bookmarks.add);

	function setVerb() {
		var verb, no;
		var list_length = getOption('verb-list-length');
		var session_verbs = session_results.map(e => e[0] + '');	
		if (bookmarks.length < list_length) {
			do {
				no = Math.floor(Math.random() * VERBS.length);
			} while (session_verbs.indexOf(VERBS[no].id) != -1)
			verb = VERBS[no];
		} else {
			var exclude_verbs = session_verbs.slice(-Math.floor(list_length * 0.7));
			var possible_verbs = bookmarks.filter(id => exclude_verbs.indexOf(id) == -1);
			no = Math.floor(Math.random() * possible_verbs.length);
			verb = VERBS.find(v => v.id == possible_verbs[no]);
		}

		if (!verb)
			return alert('Smth wrong!');

		session_results.push([verb.id, false]);
		$definition.innerHTML = verb.definition;
		$definition.setAttribute('answer', verb.id);
		$answer.setAttribute('verb', verb.verb);
		$answer.setAttribute('prep', verb.prep);
		$answer.innerHTML = '<span>' + verb.verb + '</span> <span>' + verb.prep + '</span>';

		var no;
		var verbs = [verb.verb];
		var complexity = getOption('verb-complexity');
		while (verbs.length < complexity) {
			no = Math.floor(Math.random() * VERBS.verbs.length);
			var v = VERBS.verbs[no];	
			if (v != verb.verb && verbs.indexOf(v) == -1)
				verbs.push(v);
		}
		var preps = [verb.prep];
		while (preps.length < complexity) {
			no = Math.floor(Math.random() * VERBS.preps.length);
			var p = VERBS.preps[no];
			if (p != verb.prep && preps.indexOf(p) == -1)
				preps.push(p);
		}
		
		$verbs.innerHTML = verbs.shuffle().map(v => '<div>' + v + '</div>').join('');
		$preps.innerHTML = preps.shuffle().map(p => '<div>' + p + '</div>').join('');
			
		function onClick() {
			var $parent = this.parentNode;
			for(var i = 0; i < $parent.children.length; i++)
				$parent.children[i].removeAttribute('current');
			
			this.setAttribute('current', true);
			if (document.querySelectorAll('.list div[current]').length == 2) {
				var is_verb = $verbs.querySelector('div[current]').textContent == verb.verb;
				var is_prep = $preps.querySelector('div[current]').textContent == verb.prep;
				var is_correct = is_verb && is_prep;
				session_results[session_results.length - 1][1] = is_correct;

				$answer.children[0].setAttribute('correct', is_verb);
				$answer.children[1].setAttribute('correct', is_prep);

				var delta = [-3, -1, 5][+ is_verb + is_prep];
				$score.setAttribute('score', +$score.getAttribute('score') + delta);

				if (is_correct) {
					var results = session_results.filter(sres => sres[0] == verb.id);
					if (results.length > 1 && results.pop()[1] && results.pop()[1]) // last two answers were correct
						bookmarks.remove(verb.id);
				} else {
					bookmarks.add();
				}

				if (is_correct && getOption('verb-sound-enable') == 'yes')
					$audio.play();

				setTimeout(() => document.dispatchEvent(new CustomEvent('speak-text', {detail: verb.verb + ' ' + verb.prep})), 500);
				setTimeout(setVerb, 2000);	
			}
		}
		document.querySelectorAll('.list div').forEach($e => $e.addEventListener('click', onClick));	
	}

	if (typeof speechSynthesis !== 'undefined') {
		var voices = [];
		document.addEventListener('speak-text', (event) => speakText(event.detail));

		function speakText(text) {
			var current_voice = getOption('verb-voice');
			if (current_voice == 'no' || !voices[current_voice])
				return;
			var utterance = new SpeechSynthesisUtterance(text);
			utterance.voice = voices[current_voice];
			utterance.rate = 1;
			speechSynthesis.speak(utterance);
		};

		function loadVoices () {
			var $voices = document.querySelector('#verb-voice');
			voices = speechSynthesis.getVoices();

			if ($voices.children.length > 1 || voices.length == 0)
				return;	

			$voices.style.display = 'block';
			voices.forEach(function(e, i) {
				if (e.lang.indexOf('en') == 0 && (e.lang.indexOf('US') != -1 || e.lang.indexOf('UK') != -1 || e.lang.indexOf('GB') != -1)) {
					$voices.innerHTML += ' <div value = "{value}" title = "{title}">{html}</div>'
						.replace('{value}', i)
						.replace('{title}', e.name)
						.replace('{html}', $voices.children.length);
				}	
			});

			if ($voices.children.length == 2)
				$voices.children[1].innerHTML = 'yes';

			var width = parseInt(310 / $voices.children.length) - 5;
			for(var i = 0; i < $voices.children.length; i++) {
				$voices.children[i].style.width = width + 'px';
				$voices.children[i].addEventListener('click', function (event) {	
					setOption('verb-voice', this.getAttribute('value'));
					speakText($answer.getAttribute('verb') + ' '+ $answer.getAttribute('prep'));
				});
			}
			setOption('verb-voice', localStorage.getItem('verb-voice'));
		}
		
		loadVoices();
		if (speechSynthesis.onvoiceschanged !== undefined)
			speechSynthesis.onvoiceschanged = loadVoices;
	}

	function setPage(page) {
		document.querySelectorAll('.page').forEach($e => $e.removeAttribute('current'));
		document.querySelector('#page-' + page).setAttribute('current', true);
	}

	history.pushState({}, '', window.location.pathname);
	window.addEventListener('popstate', function(event) {
		var page = document.querySelector('.page[current]');
		if (page.id == 'page-main')
			return history.back();

		history.pushState(null, null, window.location.pathname);
		if (page.id == 'page-game')
			return setPage('main');

		page.querySelector('.close').click();
	}, false);

	Array.prototype.shuffle = function () {
		var array = this.slice();	
		var count = array.length, randomnumber, temp;
		while( count ){
			randomnumber = Math.random() * count-- | 0;
			temp = array[count];
			array[count] = array[randomnumber];
			array[randomnumber] = temp;
		}
		return array;
	}
});