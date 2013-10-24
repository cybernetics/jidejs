/**
 * The Control is the base class for all controls provided by jide.js. A Control is a Component which is further refined
 * and has a {@link module:jidejs/ui/Skin}.
 *
 * @module jidejs/ui/Control
 */
define('jidejs/ui/Control', [
	'jidejs/base/Class', 'jidejs/base/ObservableProperty', 'jidejs/ui/Component', 'jidejs/ui/Skin', 'jidejs/base/DOM',
	'jidejs/ui/register'
], function(Class, Observable, Component, Skin, DOM, register) {
	function setSkin(event) {
		if(event.oldValue) event.oldValue.dispose();
		if(!event.value) return; // exit early if there is no new skin
		var skin = event.value;

		if(this.element && this.element.parentNode) {
			var element = this.element;
			element.parentNode.replaceChild(skin.element, element);
			DOM.removeData(element);
			DOM.getData(this.element).component = this;
			this.element = skin.element;
		} else {
			this.element = skin.element;
			DOM.getData(this.element).component = this;
		}
		skin.install();
	}

	function parseChildren(component, element, config) {
		for(var i = 0, attribs = element.attributes, len = attribs.length; i < len; i++) {
			var attribute = attribs[i];
			config[attribute.nodeName] = attribute.nodeValue;
		}
		// copy children to a save place
		if(typeof component.children !== 'undefined') {
			var children = [];
			copyChildren(element, config, function(child) {
				children[children.length] = child;
			});
			config.children = children;
		} else if(typeof component.contentProperty !== 'undefined') {
			var frag = document.createDocumentFragment();
			copyChildren(element, config, function(child) {
				frag.appendChild(child);
			});
			config.content = frag;
		} else {
			copyChildren(element, config, function(child) {
				element.removeChild(child);
			});
		}
	}

	function copyChildren(element, config, fallbackHandler) {
		while(element.firstElementChild) {
			var child = element.firstElementChild;
			if(child.tagName === 'JIDE-PROP') {
				config[child.propertyName] = child.propertyValue;
				element.removeChild(child);
			} else if(child.hasAttribute('data-property')) {
				config[child.getAttribute('data-property')] = child;
				element.removeChild(child);
			} else if(child.tagName === 'TEMPLATE') {
				config.template = child;
				element.removeChild(child);
			} else {
				fallbackHandler(child);
			}
		}
	}

	/**
	 * Creates a new Control and configures it with the provided `config` object.
	 *
	 * The `config` object must contain a field named `skin` which must contain the initial {@link module:jidejs/ui/Skin}
	 * to be used for the control.
	 *
	 * @memberof module:jidejs/ui/Control
	 * @param {object} config The configuration of the Control.
	 * @param {jidejs/ui/Skin} config.skin The Skin of the control.
	 * @constructor
	 * @alias module:jidejs/ui/Control
	 */
	function Control(config) {
		installer(this);
		if(config.element) parseChildren(this, config.element, config);
		var skin = config.skin || (new (this.constructor.Skin)(this, config.element));
		delete config.skin;
		this.element = skin.element;
		Component.call(this, skin.element);
		this.skin = skin;
		this.skinProperty.subscribe(setSkin, this);
		Component.applyConfiguration(this, config);
		skin.install();

		this.classList.add('jide-control');
	}
	Class(Control).extends(Component).def({
		/**
		 * The Skin of the control.
		 */
		skin: null,
		/**
		 * The Skin of the control.
		 */
		skinProperty:null,
		/**
		 * The tooltip that should be displayed when the user moves the mouse cursor over the control.
		 * @type module:jidejs/ui/control/Tooltip
		 */
		tooltip: null,
		/**
		 * The tooltip that should be displayed when the user moves the mouse cursor over the control.
		 * @type module:jidejs/base/ObservableProperty
		 */
		tooltipProperty: null,
		/**
		 * If `true`, then the tooltip will be handled automatically by the control.
		 * @type boolean
		 */
		automaticTooltipHandling: true,
		/**
		 * The context menu that should be displayed when the user right clicks or long taps the control.
		 * @type module:jidejs/ui/control/ContextMenu
		 */
		contextmenu: null,
		/**
		 * The context menu that should be displayed when the user right clicks or long taps the control.
		 * @type module:jidejs/base/ObservableProperty
		 */
		contextmenuProperty: null,

		/**
		 * Releases all resources held by this control.
		 */
		dispose: function() {
			this.skin = null;
			Component.prototype.dispose.call(this);
			installer.dispose(this);
		}
	});
	var installer = Observable.install(Control, 'skin', 'tooltip', 'contextmenu');

	Control.create = function(name, Parent, properties, def) {
		var mixins;
		if(arguments.length === 1) {
			def = name;
			name = def['@name'];
			Parent = def['@extends'];
			properties = def['@properties'];
			mixins = def['@mixin'];
			delete def['@extends'];
			delete def['@properties'];
			delete def['@name'];
			delete def['@mixin'];
		}
		Parent || (Parent = Control);
		properties || (properties = []);
		def || (def = {});
		var init = def['@init'];
		delete def['@init'];
		var constructor = (def.hasOwnProperty('constructor') && def.constructor) || function(config) {
			installer(this);
			config = config || {};
			if(!config.skin) {
				config.skin  = new (constructor.Skin)(this, config.element);
			}
			if(typeof init !== 'undefined') init.call(this, config);
			Parent.call(this, config);
		};
		delete def.constructor;
		// TODO: only add display name when not creating a full build
		constructor.displayName = name;
		constructor.name = name;

		if(def.Skin) {
			constructor.Skin = def.Skin;
			delete def.Skin;
		}

		var dispose = def.dispose;
		def.dispose = function() {
			if(installer) installer.dispose(this);
			if(dispose) dispose.call(this);
			Parent.prototype.dispose.call(this);
		};
		Class(constructor).extends(Parent).def(def);

		// install properties
		if(properties.length > 0) {
			properties.unshift(constructor);
			var installer = Observable.install.apply(Observable, properties);
		}
		return constructor;
	};

	register('jide-control', Control, Component, ['skin', 'tooltip', 'contextmenu'], []);

	return Control;
});