window.addEventListener('load', function() {
	localStorage.setItem('verb-version', 2);

	var VERBS = [];
	var IRVERBS = [];
	
	var current_verbs = (localStorage.getItem('verb-current-list') || '').split(',').map(e => parseInt(e)).filter(e => !isNaN(e)).filter((e, i, arr) => arr.indexOf(e) == i);
	var session_verbs = [];

	var $audio = new Audio('correct.mp3');

	fetch('verbs.json')
		.then(response => response.json())
		.then(function (json) {
			VERBS = json.filter(e => e.examples.length > 0 && e.synonyms.length > 0);
			console.log('Load: ' + VERBS.length + ' verbs');

			var verbs = [];
			VERBS.forEach(function (v) {
				v.id = parseInt(v.id);
				v.verb_prep = v.verb + ' ' + v.prep;
				v.synonyms = v.synonyms.join(', ');
				v.ref = ('verb ' + v.verb + ' ' + v.prep).replace(/ /g, '-');
				if (current_verbs.indexOf(v.id) != -1)
					verbs.push(v.id);
			});

			current_verbs = verbs;	

			document.querySelector('#loading').remove();
			document.querySelector('#button-play').style.display = 'block';	
		});

	fetch('irverbs.json')
		.then(response => response.json())
		.then(json => IRVERBS = json);

	var $answer = document.querySelector('#answer');
	var $definition = document.querySelector('#definition');
	var $synonyms = document.querySelector('#synonyms');
	var $suggestions = document.querySelector('#suggestions');
	var $examples = document.querySelector('#examples');

	var $verbs = document.querySelector('#verbs');
	var $preps = document.querySelector('#preps');

	document.querySelector('#button-play').addEventListener('click', () => setPage('game') || setVerb());
	document.querySelector('#button-help').addEventListener('click', () => setPage('help'));
	document.querySelector('#button-help-close').addEventListener('click', () => setPage('game'));
	document.querySelector('#button-option').addEventListener('click', () => setPage('option'));
	document.querySelector('#button-option-close').addEventListener('click', () => setPage('game'));
	document.querySelector('#verb-sound-enable [value="yes"]').addEventListener('click', () => $audio.play());

	document.querySelector('#button-verbs').addEventListener('click', function () {
		var $verbs = document.querySelector('#page-verbs #verbs');
		$verbs.innerHTML = '';

		current_verbs.forEach(function (id) {
			var verb = VERBS.find(v => v.id == id);
			if (!verb)
				return;

			var $e = document.createElement('div');
			$e.innerHTML = '<div id = "verb-prep">{verb-prep}</div><div id = "synonyms" title = "Synonyms">{synonyms}</div><div id = "definition">{definition}</div><div id = "examples">{examples}</div><div id = "remove">&#10006;</div>'
				.replace('{verb-prep}', verb.verb_prep)
				.replace('{definition}', verb.definition)
				.replace('{synonyms}', verb.synonyms)
				.replace('{examples}', verb.examples.map(e => '<div>' + parseExample(verb, e) + '</div>').join(''));

			$e.querySelector('#verb-prep').onclick = () => window.open('https://www.macmillandictionary.com/dictionary/british/' + verb.verb_prep.replace(/ /g, '-'));
			$e.querySelector('#remove').onclick = () => removeVerb(id) || $e.remove(); 

			$verbs.appendChild($e);
		})
		setPage('verbs');
	});
	document.querySelector('#button-verbs-close').addEventListener('click', () => setPage('game'));

	document.querySelector('#button-verb-skip').addEventListener('click', setVerb);
	document.querySelector('#button-verb-add').addEventListener('click', function () {
		var id = $answer.getAttribute('verb-id');
		var verb = VERBS.find(v => v.id == id);
		localStorage.setItem(verb.ref, 1);
		addVerb(verb.id);

		setVerb();
	});

	$answer.addEventListener('click', function () {
		if ($answer.children.length == 0)
			speakText($answer.textContent);
	});

	function addVerb (id) {
		id = parseInt(id);
		if (current_verbs.indexOf(id) != -1)
			return;
 
		current_verbs.push(id);
		localStorage.setItem('verb-current-list', current_verbs.join(','));
	}

	function removeVerb(id) {
		current_verbs = current_verbs.filter(v => v != id);
		localStorage.setItem('verb-current-list', current_verbs.join(','));	
	}

	['verb-list-length', 'verb-sound-enable'].forEach(function (opt) {
		var $e = document.querySelector('#' + opt);
		for(var i = 0; i < $e.children.length; i++)
			$e.children[i].addEventListener('click', (event) => setOption(opt, event.target.getAttribute('value')));
		setOption(opt, localStorage.getItem(opt));
	});

	function setOption(opt, value) {
		var $e = document.querySelector('#' + opt);
		var def = $e.getAttribute('default');
		localStorage.setItem(opt, value || def);
		for(var i = 0; i < $e.children.length; i++)
			$e.children[i].removeAttribute('current');

		var $curr = $e.querySelector('[value="' + value + '"]') || $e.querySelector('[value="' + def + '"]')
		$curr.setAttribute('current', true);
	}

	function getOption(opt) {
		var $e = document.querySelector('#' + opt + ' [current]');
		return $e ? $e.getAttribute('value') : document.querySelector('#' + opt).getAttribute('default');
	}

	function setVerb(verb) {
		var verb, verb_no, exclude_verbs;
		var list_length = getOption('verb-list-length') || 10;	

		if (current_verbs.length < list_length) {
			exclude_verbs = VERBS.filter(v => current_verbs.indexOf(v.id) != -1).map(v => v.verb_prep);
			do {
				verb_no = Math.floor(Math.random() * VERBS.length);
				verb = VERBS[verb_no];
			} while (session_verbs.indexOf(verb.id) != -1 || current_verbs.indexOf(verb.id) != -1 || exclude_verbs.indexOf(verb.verb_prep) != -1)	
			localStorage.removeItem(verb && verb.ref);
		} else {
			exclude_verbs = session_verbs.slice(-Math.floor(list_length * 0.7));
			var possible_verbs = current_verbs.filter(id => exclude_verbs.indexOf(id) == -1);
			verb_no = Math.floor(Math.random() * possible_verbs.length);
			verb = VERBS.find(v => v.id == possible_verbs[verb_no]);
		}

		if (!verb)
			return alert('Smth wrong!');

		var stage = Math.max(parseInt(localStorage.getItem(verb.ref)) || 0, 0);
		document.querySelector('#page-game').setAttribute('stage', stage);

		if (stage > 9) 
			return removeVerb(verb.id) || setVerb();

		session_verbs.push(verb.id);

		/*
			Stages:
			0 - Show verb card
			1 - Combine answer from 3 verbs and 3 preps
			2 - Select one of 3 definitions by verb
			3 - Combine answer from 5 verbs and 5 preps
			4 - Select one of 3 synonyms by verb
			5 - Select one of 5 definitions by verb
			6 - Combine answer from 8 verbs and 8 preps
			7 - Reconstruct verb in example
			8 - Select one of 5 suggestions by synonyms
			9 - Reconstruct prep in example
		*/

		function is_stage () {
			return Array.prototype.some.call(arguments, e => e == stage);
		}

		function getRandomList(prop, length) {
			if (!length)
				return [];

			var addon = {
				'verb': ['go', 'get', 'put', 'turn', 'push', 'take', 'call'],
				'prep': ['off', 'out', 'on', 'up', 'down', 'in'],
				'definition': [],
				'synonyms': []
			}

			return current_verbs.map(id => VERBS.find(v => v.id == id)[prop]).concat(addon[prop])
				.filter((e, i, arr) => arr.indexOf(e) === i && e != verb[prop]).shuffle().slice(0, length - 1)
				.concat(verb[prop]).shuffle().map(v => '<div>' + v + '</div>').join('');
		}

		$answer.setAttribute('verb-id', verb.id);
		$answer.setAttribute('verb', verb.verb);
		$answer.setAttribute('prep', verb.prep);
		$answer.innerHTML = is_stage (0, 2, 4, 5, 8) ? verb.verb_prep : '<span>' + verb.verb + '</span> <span>' + verb.prep + '</span>';
		$definition.removeAttribute('checked');
		$definition.innerHTML = is_stage(0, 1, 3, 4, 6) ? verb.definition : '';
		if (is_stage(7)) 
			$definition.innerHTML = parseExample(verb, verb.examples[0], 'verb');
		if (is_stage(9)) 
			$definition.innerHTML = parseExample(verb, verb.examples[1] || verb.examples[0], 'prep');	

		$synonyms.innerHTML = is_stage(0, 1, 3, 6, 7) ? verb.synonyms : '';
		$suggestions.innerHTML = is_stage(2, 5) ? getRandomList('definition', stage == 2 ? 3 : 5) : is_stage(4, 8) ? getRandomList('synonyms', stage == 4 ? 3 : 5) : '';
		$suggestions.querySelectorAll('div').forEach($e => $e.addEventListener('click', onSuggestionClick));
		$examples.innerHTML = is_stage(0) ? verb.examples.map(e => '<div>' + parseExample(verb, e) + '</div>').join('') : '';

		var len = [0, 3, 0, 5, 0, 0, 8, 8, 0, 8][stage] || 0;
		$verbs.innerHTML = getRandomList('verb', len);
		$preps.innerHTML = getRandomList('prep', len);
		document.querySelectorAll('.list div').forEach($e => $e.addEventListener('click', onVerbPrepClick));

		if (is_stage(0, 2, 4, 5, 8))
			speakText(verb.verb_prep);	

		function onSuggestionClick () {
			var is_correct = is_stage(2, 5) ? this.textContent.trim() == verb.definition.trim() : this.textContent.trim() == verb.synonyms;
			this.setAttribute('correct', is_correct);
			next(is_correct);
		}

		function onVerbPrepClick () {
			var $parent = this.parentNode;
			for(var i = 0; i < $parent.children.length; i++)
				$parent.children[i].removeAttribute('current');
			
			this.setAttribute('current', true);

			if (is_stage(1, 3, 6) && document.querySelectorAll('.list div[current]').length == 2) {
				var is_verb = $verbs.querySelector('div[current]').textContent == verb.verb;
				var is_prep = $preps.querySelector('div[current]').textContent == verb.prep;
				var is_correct = is_verb && is_prep;

				$answer.children[0].setAttribute('correct', is_verb);
				$answer.children[1].setAttribute('correct', is_prep);

				next(is_correct);
			}

			if (is_stage(7, 9)) {
				$definition.setAttribute('checked', true);
				var prop = is_stage(7) ? 'verb' : 'prep';
				var $e = $definition.querySelector('#' + prop);
				var is_correct = $e && ($e.getAttribute(prop) == this.textContent.trim());
				$e.setAttribute('correct', is_correct);

				next(is_correct);
			};
		}

		function next(is_correct) {
			localStorage.setItem(verb.ref, Math.max(stage + (is_correct ? 1 : -1), 1));

			if (is_correct && stage == 9)  
				removeVerb(verb.id);

			if (is_correct && getOption('verb-sound-enable') == 'yes')
				$audio.play();

			setTimeout(() => document.dispatchEvent(new CustomEvent('speak-text', {detail: verb.verb_prep})), 500);
			setTimeout(setVerb, 2000);					
		}
	}

	function parseExample(_verb, text, prop) {
		var verb = _verb.verb;
		var variants = [
			verb + 'ing', verb + verb.slice(-1) + 'ing', verb.slice(0, verb.length - 1) + 'ing', verb.slice(0, verb.length - 2) + 'ying', 
			verb + 's', verb + 'es', verb.slice(0, verb.length - 1) + 'ies',
			verb + 'ed', verb.slice(0, verb.length - 1) + 'ed', verb.slice(0, verb.length - 1) + 'id', verb.slice(0, verb.length - 1) + 'ied', verb + verb.slice(-1) + 'ed'
		];
		if (IRVERBS[verb])
			variants.push.apply(variants, IRVERBS[verb]);
		variants.push(verb);
	
		var res = text;
						
		for(var i = 0; i < variants.length && res == text; i++)
			res = text.replace(new RegExp('\\b' + variants[i] + '\\b', 'i'), '<span id = "verb" verb = "' + verb + '">' + variants[i] + '</span>');
		
		if (prop == 'verb')
			return res;
	
		var prep = _verb.prep;
		var verb_pos = res.length - res.indexOf('</span>') - 7;
		res = prop == 'prep' ? text : res;
	
		return res.substr(0, res.length - verb_pos) + res.slice(-verb_pos).replace(new RegExp('\\b' + prep + '\\b', 'i'), '<span id = "prep" prep = "' + prep + '">' + prep + '</span>');
	}

	function speakText(text) {
		var event = new CustomEvent('speak-text', {detail: text});
		document.dispatchEvent(event);
	}

	if (typeof speechSynthesis !== 'undefined') {
		var voices = [];

		document.addEventListener('speak-text', function (event) {
			var text = event.detail;

			var current_voice = getOption('verb-voice');
			if (current_voice == 'no' || !voices[current_voice])
				return;
			var utterance = new SpeechSynthesisUtterance(text);
			utterance.voice = voices[current_voice];
			utterance.rate = 1;
			speechSynthesis.speak(utterance);
		});

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
				$voices.children[1].innerHTML = 'Yes';

			var width = parseInt(315 / $voices.children.length) - 5;
			for(var i = 0; i < $voices.children.length; i++) {
				$voices.children[i].style.width = width + 'px';
				$voices.children[i].addEventListener('click', function (event) {	
					setOption('verb-voice', this.getAttribute('value'));
					speakText('Hi there!');
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
		while (count) {
			randomnumber = Math.random() * count-- | 0;
			temp = array[count];
			array[count] = array[randomnumber];
			array[randomnumber] = temp;
		}
		return array;
	}
});