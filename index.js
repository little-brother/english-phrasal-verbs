window.addEventListener('load', function() {
	localStorage.setItem('verb-version', 2);

	var VERBS = [];
	var IRVERBS = [];

	var verbs = {
		current: loadVerbList('current'),
		learned: loadVerbList('learned'),
		session: []
	}
	
	var $success = new Audio('correct.mp3');

	Promise.all(['verbs.json', 'irverbs.json'].map(f => fetch(f).then(res => res.json())))
		.then(function (res) {
			VERBS = res[0].filter(e => e.examples.length > 0 && e.synonyms.length > 0);
			console.log('Load: ' + VERBS.length + ' verbs');

			var current_verbs = [];
			var learned_verbs = [];
			VERBS.forEach(function (v) {
				v.id = parseInt(v.id);
				v.verb_prep = v.verb + ' ' + v.prep;
				v.synonyms = v.synonyms.join(', ');
				v.ref = ('verb ' + v.verb + ' ' + v.prep).replace(/ /g, '-');

				if (verbs.current.indexOf(v.id) != -1)
					current_verbs.push(v.id);
				if (verbs.learned.indexOf(v.id) != -1)
					learned_verbs.push(v.id);
			});

			verbs.current = current_verbs;
			verbs.learned = learned_verbs;

			IRVERBS = res[1];
			
			$('#page-start #loading').remove();
			initOptions();
		});

	var $answer = $('#page-main #answer');
	var $definition = $('#page-main #definition');
	var $synonyms = $('#page-main #synonyms');
	var $suggestions = $('#page-main #suggestions');
	var $examples = $('#page-main #examples');

	var $verbs = $('#page-main #verbs');
	var $preps = $('#page-main #preps');

	$('#page-start #button-start').addEventListener('click', () => setPage('main') || setVerb());
	$('#page-main #button-help').addEventListener('click', () => setPage('help'));
	$('#page-main #button-option').addEventListener('click', () => setPage('option'));
	$('#page-option #verb-sound-enable [value="yes"]').addEventListener('click', () => $success.play());
	$('.close', $e => $e.addEventListener('click', () => setPage($e.getAttribute('back'))));

	$('#page-main #button-verbs').addEventListener('click', function () {
		var $verbs = $('#page-verbs #verbs');
		$verbs.innerHTML = '';

		verbs.current.forEach(function (id) {
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
			$e.querySelector('#remove').onclick = () => removeVerb('current', id) || $e.remove(); 

			$verbs.appendChild($e);
		})
		setPage('verbs');
	});

	$('#page-main #button-verb-skip').addEventListener('click', setVerb);
	$('#page-main #button-verb-add').addEventListener('click', function () {
		var id = $answer.getAttribute('verb-id');
		var verb = VERBS.find(v => v.id == id);
		localStorage.setItem(verb.ref, 1);
		addVerb('current', verb.id);

		setVerb();
	});

	$answer.addEventListener('click', function () {
		if ($answer.children.length == 0)
			speakText($answer.textContent);
	});

	function loadVerbList (type) {
		return (localStorage.getItem('verb-' + type + '-list') || '')
			.split(',').map(e => parseInt(e)).filter(e => !isNaN(e))
			.filter((e, i, arr) => arr.indexOf(e) == i)
	}

	function addVerb (type, id) {
		id = parseInt(id);
		if (verbs[type].indexOf(id) != -1)
			return;
 
		verbs[type].push(id);
		localStorage.setItem('verb-' + type + '-list', verbs[type].join(','));
	}
	
	function removeVerb (type, id) {
		verbs[type] = verbs[type].filter(v => v != id);
		localStorage.setItem('verb-' + type + '-list', verbs[type].join(','));	
	}

	function initOptions() {
		$('#page-option .content > div', function ($opt) {	
			var opt = $opt.id;
			var $e = $('#' + opt);
			for(var i = 0; i < $e.children.length; i++)
				$e.children[i].addEventListener('click', (event) => setOption(opt, event.target.getAttribute('value')));
			setOption(opt, localStorage.getItem(opt));
		});
	}

	function setOption(opt, value) {
		var $e = $('#' + opt);
		var def = $e.getAttribute('default');
		localStorage.setItem(opt, value || def);
		for(var i = 0; i < $e.children.length; i++)
			$e.children[i].removeAttribute('current');

		var $curr = $e.querySelector('[value="' + value + '"]') || $e.querySelector('[value="' + def + '"]')
		$curr.setAttribute('current', true);
	}

	function getOption(opt) {
		var $e = $('#' + opt + ' [current]');
		return $e ? $e.getAttribute('value') : $('#' + opt).getAttribute('default');
	}

	function setVerb(verb) {
		var verb, verb_no, exclude_verbs, stage;
		var list_length = getOption('verb-list-length') || 10;	

		if (verbs.current.length < list_length) {
			exclude_verbs = VERBS.filter(v => verbs.current.indexOf(v.id) != -1).map(v => v.verb_prep);
			do {
				verb_no = Math.floor(Math.random() * VERBS.length);
				verb = VERBS[verb_no];
			} while (verbs.session.indexOf(verb.id) != -1 || verbs.current.indexOf(verb.id) != -1 || exclude_verbs.indexOf(verb.verb_prep) != -1)	
			localStorage.removeItem(verb && verb.ref);
			stage = 0;
		} else if (getOption('verb-check-learned') == 'yes' && verbs.current.length < list_length * 1.5 && Math.random() > 0.9 && verbs.learned.length) {
			verb_no = Math.floor(Math.random() * verbs.learned.length);
			verb = VERBS.find(v => v.id = verb_no);
			stage = 7 + Math.floor(Math.random() * 3);
		} else {
			exclude_verbs = verbs.session.slice(-Math.floor(list_length * 0.7));
			var possible_verbs = verbs.current.filter(id => exclude_verbs.indexOf(id) == -1);
			verb_no = Math.floor(Math.random() * possible_verbs.length);
			verb = VERBS.find(v => v.id == possible_verbs[verb_no]);
			stage = Math.max(parseInt(localStorage.getItem(verb.ref)) || 0, 0);
		}

		if (!verb) 
			return alert('Smth wrong!');

		$('#page-main').setAttribute('stage', stage);

		if (stage > 9) 
			return removeVerb(verb.id, 'current') || setVerb();

		verbs.session.push(verb.id);

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

			return verbs.current.map(id => VERBS.find(v => v.id == id)[prop]).concat(addon[prop])
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
		$('.list div', $e => $e.addEventListener('click', onVerbPrepClick));

		if (is_stage(0, 2, 4, 5, 8))
			speakText(verb.verb_prep);	

		function onSuggestionClick () {
			if (this.hasAttribute('correct'))
				return;

			var is_correct = is_stage(2, 5) ? this.textContent.trim() == verb.definition.trim() : this.textContent.trim() == verb.synonyms;
			this.setAttribute('correct', is_correct);
			next(is_correct);
		}

		function onVerbPrepClick () {
			if (!!$answer.querySelector('div[correct]'))
				return;

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

			if (!is_correct) {
				addVerb('current', verb.id);
				removeVerb('learned', verb.id);
			}

			if (is_correct && stage == 9) {  
				removeVerb('current', verb.id);
				addVerb('learned', verb.id);
			}

			if (is_correct && getOption('verb-sound-enable') == 'yes')
				$success.play();

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
			var $voices = $('#verb-voice');
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
		$('.page', $e => $e.removeAttribute('current'));
		$('#page-' + page).setAttribute('current', true);
	}

	history.pushState({}, '', window.location.pathname);
	window.addEventListener('popstate', function(event) {
		var page = $('.page[current]');
		if (page.id == 'page-start')
			return history.back();

		history.pushState(null, null, window.location.pathname);
		if (page.id == 'page-main')
			return setPage('start');

		page.querySelector('.close').click();
	}, false);

	function $ (selector, apply) {
		return apply ? Array.prototype.slice.call(document.querySelectorAll(selector) || []).forEach(apply) : document.querySelector(selector);
	}

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