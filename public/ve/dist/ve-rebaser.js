( function ( ve ) {
var module = undefined;
ve.dm = {};
/*!
 * OOjs v7.0.1
 * https://www.mediawiki.org/wiki/OOjs
 *
 * Copyright 2011-2023 OOjs Team and other contributors.
 * Released under the MIT license
 * https://oojs.mit-license.org
 */
( function ( global ) {

'use strict';

/* exported slice, toString */
/**
 * Namespace for all classes, static methods and static properties.
 *
 * @namespace OO
 */
var
	// eslint-disable-next-line no-redeclare
	OO = {},
	// Optimisation: Local reference to methods from a global prototype
	hasOwn = OO.hasOwnProperty,
	slice = Array.prototype.slice,
	// eslint-disable-next-line no-redeclare
	toString = OO.toString;

/* Class Methods */

/**
 * Utility to initialize a class for OO inheritance.
 *
 * Currently this just initializes an empty static object.
 *
 * @memberof OO
 * @method initClass
 * @param {Function} fn
 */
OO.initClass = function ( fn ) {
	fn.static = fn.static || {};
};

/**
 * Inherit from prototype to another using Object#create.
 *
 * Beware: This redefines the prototype, call before setting your prototypes.
 *
 * Beware: This redefines the prototype, can only be called once on a function.
 * If called multiple times on the same function, the previous prototype is lost.
 * This is how prototypal inheritance works, it can only be one straight chain
 * (just like classical inheritance in PHP for example). If you need to work with
 * multiple constructors consider storing an instance of the other constructor in a
 * property instead, or perhaps use a mixin (see OO.mixinClass).
 *
 *     function Thing() {}
 *     Thing.prototype.exists = function () {};
 *
 *     function Person() {
 *         Person.super.apply( this, arguments );
 *     }
 *     OO.inheritClass( Person, Thing );
 *     Person.static.defaultEyeCount = 2;
 *     Person.prototype.walk = function () {};
 *
 *     function Jumper() {
 *         Jumper.super.apply( this, arguments );
 *     }
 *     OO.inheritClass( Jumper, Person );
 *     Jumper.prototype.jump = function () {};
 *
 *     Jumper.static.defaultEyeCount === 2;
 *     var x = new Jumper();
 *     x.jump();
 *     x.walk();
 *     x instanceof Thing && x instanceof Person && x instanceof Jumper;
 *
 * @memberof OO
 * @method inheritClass
 * @param {Function} targetFn
 * @param {Function} originFn
 * @throws {Error} If target already inherits from origin
 */
OO.inheritClass = function ( targetFn, originFn ) {
	if ( !originFn ) {
		throw new Error( 'inheritClass: Origin is not a function (actually ' + originFn + ')' );
	}
	if ( targetFn.prototype instanceof originFn ) {
		throw new Error( 'inheritClass: Target already inherits from origin' );
	}

	var targetConstructor = targetFn.prototype.constructor;

	// [DEPRECATED] Provide .parent as alias for code supporting older browsers which
	// allows people to comply with their style guide.
	targetFn.super = targetFn.parent = originFn;

	targetFn.prototype = Object.create( originFn.prototype, {
		// Restore constructor property of targetFn
		constructor: {
			value: targetConstructor,
			enumerable: false,
			writable: true,
			configurable: true
		}
	} );

	// Extend static properties - always initialize both sides
	OO.initClass( originFn );
	targetFn.static = Object.create( originFn.static );
};

/**
 * Copy over *own* prototype properties of a mixin.
 *
 * The 'constructor' (whether implicit or explicit) is not copied over.
 *
 * This does not create inheritance to the origin. If you need inheritance,
 * use OO.inheritClass instead.
 *
 * Beware: This can redefine a prototype property, call before setting your prototypes.
 *
 * Beware: Don't call before OO.inheritClass.
 *
 *     function Foo() {}
 *     function Context() {}
 *
 *     // Avoid repeating this code
 *     function ContextLazyLoad() {}
 *     ContextLazyLoad.prototype.getContext = function () {
 *         if ( !this.context ) {
 *             this.context = new Context();
 *         }
 *         return this.context;
 *     };
 *
 *     function FooBar() {}
 *     OO.inheritClass( FooBar, Foo );
 *     OO.mixinClass( FooBar, ContextLazyLoad );
 *
 * @memberof OO
 * @method mixinClass
 * @param {Function} targetFn
 * @param {Function} originFn
 */
OO.mixinClass = function ( targetFn, originFn ) {
	if ( !originFn ) {
		throw new Error( 'mixinClass: Origin is not a function (actually ' + originFn + ')' );
	}

	var key;
	// Copy prototype properties
	for ( key in originFn.prototype ) {
		if ( key !== 'constructor' && hasOwn.call( originFn.prototype, key ) ) {
			targetFn.prototype[ key ] = originFn.prototype[ key ];
		}
	}

	// Copy static properties - always initialize both sides
	OO.initClass( targetFn );
	if ( originFn.static ) {
		for ( key in originFn.static ) {
			if ( hasOwn.call( originFn.static, key ) ) {
				targetFn.static[ key ] = originFn.static[ key ];
			}
		}
	} else {
		OO.initClass( originFn );
	}
};

/**
 * Test whether one class is a subclass of another, without instantiating it.
 *
 * Every class is considered a subclass of Object and of itself.
 *
 * @memberof OO
 * @method isSubClass
 * @param {Function} testFn The class to be tested
 * @param {Function} baseFn The base class
 * @return {boolean} Whether testFn is a subclass of baseFn (or equal to it)
 */
OO.isSubclass = function ( testFn, baseFn ) {
	return testFn === baseFn || testFn.prototype instanceof baseFn;
};

/* Object Methods */

/**
 * Get a deeply nested property of an object using variadic arguments, protecting against
 * undefined property errors.
 *
 * `quux = OO.getProp( obj, 'foo', 'bar', 'baz' );` is equivalent to `quux = obj.foo.bar.baz;`
 * except that the former protects against JS errors if one of the intermediate properties
 * is undefined. Instead of throwing an error, this function will return undefined in
 * that case.
 *
 * @memberof OO
 * @method getProp
 * @param {Object} obj
 * @param {...any} [keys]
 * @return {Object|undefined} obj[arguments[1]][arguments[2]].... or undefined
 */
OO.getProp = function ( obj ) {
	var retval = obj;
	for ( var i = 1; i < arguments.length; i++ ) {
		if ( retval === undefined || retval === null ) {
			// Trying to access a property of undefined or null causes an error
			return undefined;
		}
		retval = retval[ arguments[ i ] ];
	}
	return retval;
};

/**
 * Set a deeply nested property of an object using variadic arguments, protecting against
 * undefined property errors.
 *
 * `OO.setProp( obj, 'foo', 'bar', 'baz' );` is equivalent to `obj.foo.bar = baz;` except that
 * the former protects against JS errors if one of the intermediate properties is
 * undefined. Instead of throwing an error, undefined intermediate properties will be
 * initialized to an empty object. If an intermediate property is not an object, or if obj itself
 * is not an object, this function will silently abort.
 *
 * @memberof OO
 * @method setProp
 * @param {Object} obj
 * @param {...any} [keys]
 * @param {any} [value]
 */
OO.setProp = function ( obj ) {
	if ( Object( obj ) !== obj || arguments.length < 2 ) {
		return;
	}
	var prop = obj;
	for ( var i = 1; i < arguments.length - 2; i++ ) {
		if ( prop[ arguments[ i ] ] === undefined ) {
			prop[ arguments[ i ] ] = {};
		}
		if ( Object( prop[ arguments[ i ] ] ) !== prop[ arguments[ i ] ] ) {
			return;
		}
		prop = prop[ arguments[ i ] ];
	}
	prop[ arguments[ arguments.length - 2 ] ] = arguments[ arguments.length - 1 ];
};

/**
 * Delete a deeply nested property of an object using variadic arguments, protecting against
 * undefined property errors, and deleting resulting empty objects.
 *
 * @memberof OO
 * @method deleteProp
 * @param {Object} obj
 * @param {...any} [keys]
 */
OO.deleteProp = function ( obj ) {
	if ( Object( obj ) !== obj || arguments.length < 2 ) {
		return;
	}
	var prop = obj;
	var props = [ prop ];
	var i = 1;
	for ( ; i < arguments.length - 1; i++ ) {
		if (
			prop[ arguments[ i ] ] === undefined ||
			Object( prop[ arguments[ i ] ] ) !== prop[ arguments[ i ] ]
		) {
			return;
		}
		prop = prop[ arguments[ i ] ];
		props.push( prop );
	}
	delete prop[ arguments[ i ] ];
	// Walk back through props removing any plain empty objects
	while (
		props.length > 1 &&
		( prop = props.pop() ) &&

		OO.isPlainObject( prop ) && !Object.keys( prop ).length
	) {
		delete props[ props.length - 1 ][ arguments[ props.length ] ];
	}
};

/**
 * Create a new object that is an instance of the same
 * constructor as the input, inherits from the same object
 * and contains the same own properties.
 *
 * This makes a shallow non-recursive copy of own properties.
 * To create a recursive copy of plain objects, use #copy.
 *
 *     var foo = new Person( mom, dad );
 *     foo.setAge( 21 );
 *     var foo2 = OO.cloneObject( foo );
 *     foo.setAge( 22 );
 *
 *     // Then
 *     foo2 !== foo; // true
 *     foo2 instanceof Person; // true
 *     foo2.getAge(); // 21
 *     foo.getAge(); // 22
 *
 * @memberof OO
 * @method cloneObject
 * @param {Object} origin
 * @return {Object} Clone of origin
 */
OO.cloneObject = function ( origin ) {
	var r = Object.create( origin.constructor.prototype );

	for ( var key in origin ) {
		if ( hasOwn.call( origin, key ) ) {
			r[ key ] = origin[ key ];
		}
	}

	return r;
};

/**
 * Get an array of all property values in an object.
 *
 * @memberof OO
 * @method getObjectValues
 * @param {Object} obj Object to get values from
 * @return {Array} List of object values
 */
OO.getObjectValues = function ( obj ) {
	if ( obj !== Object( obj ) ) {
		throw new TypeError( 'Called on non-object' );
	}

	var values = [];
	for ( var key in obj ) {
		if ( hasOwn.call( obj, key ) ) {
			values[ values.length ] = obj[ key ];
		}
	}

	return values;
};

/**
 * Use binary search to locate an element in a sorted array.
 *
 * searchFunc is given an element from the array. `searchFunc(elem)` must return a number
 * above 0 if the element we're searching for is to the right of (has a higher index than) elem,
 * below 0 if it is to the left of elem, or zero if it's equal to elem.
 *
 * To search for a specific value with a comparator function (a `function cmp(a,b)` that returns
 * above 0 if `a > b`, below 0 if `a < b`, and 0 if `a == b`), you can use
 * `searchFunc = cmp.bind( null, value )`.
 *
 * @memberof OO
 * @method binarySearch
 * @param {Array} arr Array to search in
 * @param {Function} searchFunc Search function
 * @param {boolean} [forInsertion] If not found, return index where val could be inserted
 * @return {number|null} Index where val was found, or null if not found
 */
OO.binarySearch = function ( arr, searchFunc, forInsertion ) {
	var left = 0;
	var right = arr.length;
	while ( left < right ) {
		// Equivalent to Math.floor( ( left + right ) / 2 ) but much faster
		// eslint-disable-next-line no-bitwise
		var mid = ( left + right ) >> 1;
		var cmpResult = searchFunc( arr[ mid ] );
		if ( cmpResult < 0 ) {
			right = mid;
		} else if ( cmpResult > 0 ) {
			left = mid + 1;
		} else {
			return mid;
		}
	}
	return forInsertion ? right : null;
};

/**
 * Recursively compare properties between two objects.
 *
 * A false result may be caused by property inequality or by properties in one object missing from
 * the other. An asymmetrical test may also be performed, which checks only that properties in the
 * first object are present in the second object, but not the inverse.
 *
 * If either a or b is null or undefined it will be treated as an empty object.
 *
 * @memberof OO
 * @method compare
 * @param {Object|undefined|null} a First object to compare
 * @param {Object|undefined|null} b Second object to compare
 * @param {boolean} [asymmetrical] Whether to check only that a's values are equal to b's
 *  (i.e. a is a subset of b)
 * @return {boolean} If the objects contain the same values as each other
 */
OO.compare = function ( a, b, asymmetrical ) {
	if ( a === b ) {
		return true;
	}

	a = a || {};
	b = b || {};

	if ( typeof a.nodeType === 'number' && typeof a.isEqualNode === 'function' ) {
		return a.isEqualNode( b );
	}

	for ( var k in a ) {
		if ( !hasOwn.call( a, k ) || a[ k ] === undefined || a[ k ] === b[ k ] ) {
			// Ignore undefined values, because there is no conceptual difference between
			// a key that is absent and a key that is present but whose value is undefined.
			continue;
		}

		var aValue = a[ k ];
		var bValue = b[ k ];
		var aType = typeof aValue;
		var bType = typeof bValue;
		if ( aType !== bType ||
			(
				( aType === 'string' || aType === 'number' || aType === 'boolean' ) &&
				aValue !== bValue
			) ||
			( aValue === Object( aValue ) && !OO.compare( aValue, bValue, true ) ) ) {
			return false;
		}
	}
	// If the check is not asymmetrical, recursing with the arguments swapped will verify our result
	return asymmetrical ? true : OO.compare( b, a, true );
};

/**
 * Create a plain deep copy of any kind of object.
 *
 * Copies are deep, and will either be an object or an array depending on `source`.
 *
 * @memberof OO
 * @method copy
 * @param {Object} source Object to copy
 * @param {Function} [leafCallback] Applied to leaf values after they are cloned but before they are
 *  added to the clone
 * @param {Function} [nodeCallback] Applied to all values before they are cloned. If the
 *  nodeCallback returns a value other than undefined, the returned value is used instead of
 *  attempting to clone.
 * @return {Object} Copy of source object
 */
OO.copy = function ( source, leafCallback, nodeCallback ) {
	var destination;

	if ( nodeCallback ) {
		// Extensibility: check before attempting to clone source.
		destination = nodeCallback( source );
		if ( destination !== undefined ) {
			return destination;
		}
	}

	if ( Array.isArray( source ) ) {
		// Array (fall through)
		destination = new Array( source.length );
	} else if ( source && typeof source.clone === 'function' ) {
		// Duck type object with custom clone method
		return leafCallback ? leafCallback( source.clone() ) : source.clone();
	} else if ( source && typeof source.cloneNode === 'function' ) {
		// DOM Node
		return leafCallback ?
			leafCallback( source.cloneNode( true ) ) :
			source.cloneNode( true );
	} else if ( OO.isPlainObject( source ) ) {
		// Plain objects (fall through)
		destination = {};
	} else {
		// Non-plain objects (incl. functions) and primitive values
		return leafCallback ? leafCallback( source ) : source;
	}

	// source is an array or a plain object
	for ( var key in source ) {
		destination[ key ] = OO.copy( source[ key ], leafCallback, nodeCallback );
	}

	// This is an internal node, so we don't apply the leafCallback.
	return destination;
};

/**
 * Generate a hash of an object based on its name and data.
 *
 * Performance optimization: <http://jsperf.com/ve-gethash-201208#/toJson_fnReplacerIfAoForElse>
 *
 * To avoid two objects with the same values generating different hashes, we utilize the replacer
 * argument of JSON.stringify and sort the object by key as it's being serialized. This may or may
 * not be the fastest way to do this; we should investigate this further.
 *
 * Objects and arrays are hashed recursively. When hashing an object that has a .getHash()
 * function, we call that function and use its return value rather than hashing the object
 * ourselves. This allows classes to define custom hashing.
 *
 * @memberof OO
 * @method getHash
 * @param {Object} val Object to generate hash for
 * @return {string} Hash of object
 */
OO.getHash = function ( val ) {
	return JSON.stringify( val, OO.getHash.keySortReplacer );
};

/**
 * Sort objects by key (helper function for OO.getHash).
 *
 * This is a callback passed into JSON.stringify.
 *
 * @memberof OO
 * @method getHash_keySortReplacer
 * @param {string} key Property name of value being replaced
 * @param {any} val Property value to replace
 * @return {any} Replacement value
 */
OO.getHash.keySortReplacer = function ( key, val ) {
	if ( val && typeof val.getHashObject === 'function' ) {
		// This object has its own custom hash function, use it
		val = val.getHashObject();
	}
	if ( !Array.isArray( val ) && Object( val ) === val ) {
		// Only normalize objects when the key-order is ambiguous
		// (e.g. any object not an array).
		var normalized = {};

		var keys = Object.keys( val ).sort();
		for ( var i = 0, len = keys.length; i < len; i++ ) {
			normalized[ keys[ i ] ] = val[ keys[ i ] ];
		}
		return normalized;
	} else {
		// Primitive values and arrays get stable hashes
		// by default. Lets those be stringified as-is.
		return val;
	}
};

/**
 * Get the unique values of an array, removing duplicates.
 *
 * @memberof OO
 * @method unique
 * @param {Array} arr Array
 * @return {Array} Unique values in array
 */
OO.unique = function ( arr ) {
	return Array.from( new Set( arr ) );
};

/**
 * Compute the union (duplicate-free merge) of a set of arrays.
 *
 * @memberof OO
 * @method simpleArrayUnion
 * @param {Array} a First array
 * @param {...Array} rest Arrays to union
 * @return {Array} Union of the arrays
 */
OO.simpleArrayUnion = function ( a, ...rest ) {
	var set = new Set( a );

	for ( var i = 0; i < rest.length; i++ ) {
		var arr = rest[ i ];
		for ( var j = 0; j < arr.length; j++ ) {
			set.add( arr[ j ] );
		}
	}

	return Array.from( set );
};

/**
 * Combine arrays (intersection or difference).
 *
 * An intersection checks the item exists in 'b' while difference checks it doesn't.
 *
 * @private
 * @param {Array} a First array
 * @param {Array} b Second array
 * @param {boolean} includeB Whether to items in 'b'
 * @return {Array} Combination (intersection or difference) of arrays
 */
function simpleArrayCombine( a, b, includeB ) {
	var set = new Set( b );
	var result = [];

	for ( var j = 0; j < a.length; j++ ) {
		var isInB = set.has( a[ j ] );
		if ( isInB === includeB ) {
			result.push( a[ j ] );
		}
	}

	return result;
}

/**
 * Compute the intersection of two arrays (items in both arrays).
 *
 * @memberof OO
 * @method simpleArrayIntersection
 * @param {Array} a First array
 * @param {Array} b Second array
 * @return {Array} Intersection of arrays
 */
OO.simpleArrayIntersection = function ( a, b ) {
	return simpleArrayCombine( a, b, true );
};

/**
 * Compute the difference of two arrays (items in 'a' but not 'b').
 *
 * @memberof OO
 * @method simpleArrayDifference
 * @param {Array} a First array
 * @param {Array} b Second array
 * @return {Array} Intersection of arrays
 */
OO.simpleArrayDifference = function ( a, b ) {
	return simpleArrayCombine( a, b, false );
};

/* eslint-disable-next-line no-redeclare */
/* global hasOwn, toString */

/**
 * Assert whether a value is a plain object or not.
 *
 * @memberof OO
 * @param {any} obj
 * @return {boolean}
 */
OO.isPlainObject = function ( obj ) {
	// Optimise for common case where internal [[Class]] property is not "Object"
	if ( !obj || toString.call( obj ) !== '[object Object]' ) {
		return false;
	}

	var proto = Object.getPrototypeOf( obj );

	// Objects without prototype (e.g., `Object.create( null )`) are considered plain
	if ( !proto ) {
		return true;
	}

	// The 'isPrototypeOf' method is set on Object.prototype.
	return hasOwn.call( proto, 'isPrototypeOf' );
};

/* global hasOwn, slice */

( function () {

	/**
	 * @class
	 */
	OO.EventEmitter = function OoEventEmitter() {
		// Properties

		/**
		 * Storage of bound event handlers by event name.
		 *
		 * @private
		 * @property {Object} bindings
		 */
		this.bindings = {};
	};

	OO.initClass( OO.EventEmitter );

	/* Private helper functions */

	/**
	 * Validate a function or method call in a context
	 *
	 * For a method name, check that it names a function in the context object
	 *
	 * @private
	 * @param {Function|string} method Function or method name
	 * @param {any} context The context of the call
	 * @throws {Error} A method name is given but there is no context
	 * @throws {Error} In the context object, no property exists with the given name
	 * @throws {Error} In the context object, the named property is not a function
	 */
	function validateMethod( method, context ) {
		// Validate method and context
		if ( typeof method === 'string' ) {
			// Validate method
			if ( context === undefined || context === null ) {
				throw new Error( 'Method name "' + method + '" has no context.' );
			}
			if ( typeof context[ method ] !== 'function' ) {
				// Technically the property could be replaced by a function before
				// call time. But this probably signals a typo.
				throw new Error( 'Property "' + method + '" is not a function' );
			}
		} else if ( typeof method !== 'function' ) {
			throw new Error( 'Invalid callback. Function or method name expected.' );
		}
	}

	/**
	 * @private
	 * @param {OO.EventEmitter} eventEmitter Event emitter
	 * @param {string} event Event name
	 * @param {Object} binding
	 */
	function addBinding( eventEmitter, event, binding ) {
		var bindings;
		// Auto-initialize bindings list
		if ( hasOwn.call( eventEmitter.bindings, event ) ) {
			bindings = eventEmitter.bindings[ event ];
		} else {
			bindings = eventEmitter.bindings[ event ] = [];
		}
		// Add binding
		bindings.push( binding );
	}

	/* Methods */

	/**
	 * Add a listener to events of a specific event.
	 *
	 * The listener can be a function or the string name of a method; if the latter, then the
	 * name lookup happens at the time the listener is called.
	 *
	 * @param {string} event Type of event to listen to
	 * @param {Function|string} method Function or method name to call when event occurs
	 * @param {Array} [args] Arguments to pass to listener, will be prepended to emitted arguments
	 * @param {Object} [context=null] Context object for function or method call
	 * @return {OO.EventEmitter}
	 * @throws {Error} Listener argument is not a function or a valid method name
	 */
	OO.EventEmitter.prototype.on = function ( event, method, args, context ) {
		validateMethod( method, context );

		// Ensure consistent object shape (optimisation)
		addBinding( this, event, {
			method: method,
			args: args,
			context: ( arguments.length < 4 ) ? null : context,
			once: false
		} );
		return this;
	};

	/**
	 * Add a one-time listener to a specific event.
	 *
	 * @param {string} event Type of event to listen to
	 * @param {Function} listener Listener to call when event occurs
	 * @return {OO.EventEmitter}
	 */
	OO.EventEmitter.prototype.once = function ( event, listener ) {
		validateMethod( listener );

		// Ensure consistent object shape (optimisation)
		addBinding( this, event, {
			method: listener,
			args: undefined,
			context: null,
			once: true
		} );
		return this;
	};

	/**
	 * Remove a specific listener from a specific event.
	 *
	 * @param {string} event Type of event to remove listener from
	 * @param {Function|string} [method] Listener to remove. Must be in the same form as was passed
	 * to "on". Omit to remove all listeners.
	 * @param {Object} [context=null] Context object function or method call
	 * @return {OO.EventEmitter}
	 * @throws {Error} Listener argument is not a function or a valid method name
	 */
	OO.EventEmitter.prototype.off = function ( event, method, context ) {
		if ( arguments.length === 1 ) {
			// Remove all bindings for event
			delete this.bindings[ event ];
			return this;
		}

		validateMethod( method, context );

		if ( !hasOwn.call( this.bindings, event ) || !this.bindings[ event ].length ) {
			// No matching bindings
			return this;
		}

		// Default to null context
		if ( arguments.length < 3 ) {
			context = null;
		}

		// Remove matching handlers
		var bindings = this.bindings[ event ];
		var i = bindings.length;
		while ( i-- ) {
			if ( bindings[ i ].method === method && bindings[ i ].context === context ) {
				bindings.splice( i, 1 );
			}
		}

		// Cleanup if now empty
		if ( bindings.length === 0 ) {
			delete this.bindings[ event ];
		}
		return this;
	};

	/**
	 * Emit an event.
	 *
	 * All listeners for the event will be called synchronously, in an
	 * unspecified order. If any listeners throw an exception, this won't
	 * disrupt the calls to the remaining listeners; however, the exception
	 * won't be thrown until the next tick.
	 *
	 * Listeners should avoid mutating the emitting object, as this is
	 * something of an anti-pattern which can easily result in
	 * hard-to-understand code with hidden side-effects and dependencies.
	 *
	 * @param {string} event Type of event
	 * @param {...any} [args] Arguments passed to the event handler
	 * @return {boolean} Whether the event was handled by at least one listener
	 */
	OO.EventEmitter.prototype.emit = function ( event ) {
		if ( !hasOwn.call( this.bindings, event ) ) {
			return false;
		}

		// Slicing ensures that we don't get tripped up by event
		// handlers that add/remove bindings
		var bindings = this.bindings[ event ].slice();
		var args = slice.call( arguments, 1 );
		for ( var i = 0; i < bindings.length; i++ ) {
			var binding = bindings[ i ];
			var method;
			if ( typeof binding.method === 'string' ) {
				// Lookup method by name (late binding)
				method = binding.context[ binding.method ];
			} else {
				method = binding.method;
			}
			if ( binding.once ) {
				// Unbind before calling, to avoid any nested triggers.
				this.off( event, method );
			}
			try {
				method.apply(
					binding.context,
					binding.args ? binding.args.concat( args ) : args
				);
			} catch ( e ) {
				// If one listener has an unhandled error, don't have it
				// take down the emitter. But rethrow asynchronously so
				// debuggers can break with a full async stack trace.
				setTimeout( ( function ( error ) {
					throw error;
				} ).bind( null, e ) );
			}

		}
		return true;
	};

	/**
	 * Emit an event, propagating the first exception some listener throws
	 *
	 * All listeners for the event will be called synchronously, in an
	 * unspecified order. If any listener throws an exception, this won't
	 * disrupt the calls to the remaining listeners. The first exception
	 * thrown will be propagated back to the caller; any others won't be
	 * thrown until the next tick.
	 *
	 * Listeners should avoid mutating the emitting object, as this is
	 * something of an anti-pattern which can easily result in
	 * hard-to-understand code with hidden side-effects and dependencies.
	 *
	 * @param {string} event Type of event
	 * @param {...any} [args] Arguments passed to the event handler
	 * @return {boolean} Whether the event was handled by at least one listener
	 */
	OO.EventEmitter.prototype.emitThrow = function ( event ) {
		// We tolerate code duplication with #emit, because the
		// alternative is an extra level of indirection which will
		// appear in very many stack traces.
		if ( !hasOwn.call( this.bindings, event ) ) {
			return false;
		}

		var firstError;
		// Slicing ensures that we don't get tripped up by event
		// handlers that add/remove bindings
		var bindings = this.bindings[ event ].slice();
		var args = slice.call( arguments, 1 );
		for ( var i = 0; i < bindings.length; i++ ) {
			var binding = bindings[ i ];
			var method;
			if ( typeof binding.method === 'string' ) {
				// Lookup method by name (late binding)
				method = binding.context[ binding.method ];
			} else {
				method = binding.method;
			}
			if ( binding.once ) {
				// Unbind before calling, to avoid any nested triggers.
				this.off( event, method );
			}
			try {
				method.apply(
					binding.context,
					binding.args ? binding.args.concat( args ) : args
				);
			} catch ( e ) {
				if ( firstError === undefined ) {
					firstError = e;
				} else {
					// If one listener has an unhandled error, don't have it
					// take down the emitter. But rethrow asynchronously so
					// debuggers can break with a full async stack trace.
					setTimeout( ( function ( error ) {
						throw error;
					} ).bind( null, e ) );
				}
			}

		}
		if ( firstError !== undefined ) {
			throw firstError;
		}
		return true;
	};

	/**
	 * Connect event handlers to an object.
	 *
	 * @param {Object} context Object to call methods on when events occur
	 * @param {Object.<string,string>|Object.<string,Function>|Object.<string,Array>} methods
	 *  List of event bindings keyed by event name containing either method names, functions or
	 *  arrays containing method name or function followed by a list of arguments to be passed to
	 *  callback before emitted arguments.
	 * @return {OO.EventEmitter}
	 */
	OO.EventEmitter.prototype.connect = function ( context, methods ) {
		for ( var event in methods ) {
			var method = methods[ event ];
			var args;
			// Allow providing additional args
			if ( Array.isArray( method ) ) {
				args = method.slice( 1 );
				method = method[ 0 ];
			} else {
				args = [];
			}
			// Add binding
			this.on( event, method, args, context );
		}
		return this;
	};

	/**
	 * Disconnect event handlers from an object.
	 *
	 * @param {Object} context Object to disconnect methods from
	 * @param {Object.<string,string>|Object.<string,Function>|Object.<string,Array>} [methods]
	 *  List of event bindings keyed by event name. Values can be either method names, functions or
	 *  arrays containing a method name.
	 *  NOTE: To allow matching call sites with connect(), array values are allowed to contain the
	 *  parameters as well, but only the method name is used to find bindings. It is discouraged to
	 *  have multiple bindings for the same event to the same listener, but if used (and only the
	 *  parameters vary), disconnecting one variation of (event name, event listener, parameters)
	 *  will disconnect other variations as well.
	 * @return {OO.EventEmitter}
	 */
	OO.EventEmitter.prototype.disconnect = function ( context, methods ) {
		var event;
		if ( methods ) {
			// Remove specific connections to the context
			for ( event in methods ) {
				var method = methods[ event ];
				if ( Array.isArray( method ) ) {
					method = method[ 0 ];
				}
				this.off( event, method, context );
			}
		} else {
			// Remove all connections to the context
			for ( event in this.bindings ) {
				var bindings = this.bindings[ event ];
				var i = bindings.length;
				while ( i-- ) {
					// bindings[i] may have been removed by the previous step's
					// this.off so check it still exists
					if ( bindings[ i ] && bindings[ i ].context === context ) {
						this.off( event, bindings[ i ].method, context );
					}
				}
			}
		}

		return this;
	};

}() );

( function () {

	/**
	 * Contain and manage a list of @{link OO.EventEmitter} items.
	 *
	 * Aggregates and manages their events collectively.
	 *
	 * This mixin must be used in a class that also mixes in @{link OO.EventEmitter}.
	 *
	 * @abstract
	 * @class
	 */
	OO.EmitterList = function OoEmitterList() {
		this.items = [];
		this.aggregateItemEvents = {};
	};

	OO.initClass( OO.EmitterList );

	/* Events */

	/**
	 * Item has been added.
	 *
	 * @event OO.EmitterList#add
	 * @param {OO.EventEmitter} item Added item
	 * @param {number} index Index items were added at
	 */

	/**
	 * Item has been moved to a new index.
	 *
	 * @event OO.EmitterList#move
	 * @param {OO.EventEmitter} item Moved item
	 * @param {number} index Index item was moved to
	 * @param {number} oldIndex The original index the item was in
	 */

	/**
	 * Item has been removed.
	 *
	 * @event OO.EmitterList#remove
	 * @param {OO.EventEmitter} item Removed item
	 * @param {number} index Index the item was removed from
	 */

	/**
	 * The list has been cleared of items.
	 *
	 * @event OO.EmitterList#clear
	 */

	/* Methods */

	/**
	 * Normalize requested index to fit into the bounds of the given array.
	 *
	 * @private
	 * @static
	 * @param {Array} arr Given array
	 * @param {number|undefined} index Requested index
	 * @return {number} Normalized index
	 */
	function normalizeArrayIndex( arr, index ) {
		return ( index === undefined || index < 0 || index >= arr.length ) ?
			arr.length :
			index;
	}

	/**
	 * Get all items.
	 *
	 * @return {OO.EventEmitter[]} Items in the list
	 */
	OO.EmitterList.prototype.getItems = function () {
		return this.items.slice( 0 );
	};

	/**
	 * Get the index of a specific item.
	 *
	 * @param {OO.EventEmitter} item Requested item
	 * @return {number} Index of the item
	 */
	OO.EmitterList.prototype.getItemIndex = function ( item ) {
		return this.items.indexOf( item );
	};

	/**
	 * Get number of items.
	 *
	 * @return {number} Number of items in the list
	 */
	OO.EmitterList.prototype.getItemCount = function () {
		return this.items.length;
	};

	/**
	 * Check if a list contains no items.
	 *
	 * @return {boolean} Group is empty
	 */
	OO.EmitterList.prototype.isEmpty = function () {
		return !this.items.length;
	};

	/**
	 * Aggregate the events emitted by the group.
	 *
	 * When events are aggregated, the group will listen to all contained items for the event,
	 * and then emit the event under a new name. The new event will contain an additional leading
	 * parameter containing the item that emitted the original event. Other arguments emitted from
	 * the original event are passed through.
	 *
	 * @param {Object.<string,string|null>} events An object keyed by the name of the event that
	 *  should be aggregated  (e.g., ‘click’) and the value of the new name to use
	 *  (e.g., ‘groupClick’). A `null` value will remove aggregated events.
	 * @throws {Error} If aggregation already exists
	 */
	OO.EmitterList.prototype.aggregate = function ( events ) {
		var i, item;
		for ( var itemEvent in events ) {
			var groupEvent = events[ itemEvent ];

			// Remove existing aggregated event
			if ( Object.prototype.hasOwnProperty.call( this.aggregateItemEvents, itemEvent ) ) {
				// Don't allow duplicate aggregations
				if ( groupEvent ) {
					throw new Error( 'Duplicate item event aggregation for ' + itemEvent );
				}
				// Remove event aggregation from existing items
				for ( i = 0; i < this.items.length; i++ ) {
					item = this.items[ i ];
					if ( item.connect && item.disconnect ) {
						var remove = {};
						remove[ itemEvent ] = [ 'emit', this.aggregateItemEvents[ itemEvent ], item ];
						item.disconnect( this, remove );
					}
				}
				// Prevent future items from aggregating event
				delete this.aggregateItemEvents[ itemEvent ];
			}

			// Add new aggregate event
			if ( groupEvent ) {
				// Make future items aggregate event
				this.aggregateItemEvents[ itemEvent ] = groupEvent;
				// Add event aggregation to existing items
				for ( i = 0; i < this.items.length; i++ ) {
					item = this.items[ i ];
					if ( item.connect && item.disconnect ) {
						var add = {};
						add[ itemEvent ] = [ 'emit', groupEvent, item ];
						item.connect( this, add );
					}
				}
			}
		}
	};

	/**
	 * Add items to the list.
	 *
	 * @param {OO.EventEmitter|OO.EventEmitter[]} items Item to add or
	 *  an array of items to add
	 * @param {number} [index] Index to add items at. If no index is
	 *  given, or if the index that is given is invalid, the item
	 *  will be added at the end of the list.
	 * @return {OO.EmitterList}
	 * @fires OO.EmitterList#add
	 * @fires OO.EmitterList#move
	 */
	OO.EmitterList.prototype.addItems = function ( items, index ) {
		if ( !Array.isArray( items ) ) {
			items = [ items ];
		}

		if ( items.length === 0 ) {
			return this;
		}

		index = normalizeArrayIndex( this.items, index );
		for ( var i = 0; i < items.length; i++ ) {
			var oldIndex = this.items.indexOf( items[ i ] );
			if ( oldIndex !== -1 ) {
				// Move item to new index
				index = this.moveItem( items[ i ], index );
				this.emit( 'move', items[ i ], index, oldIndex );
			} else {
				// insert item at index
				index = this.insertItem( items[ i ], index );
				this.emit( 'add', items[ i ], index );
			}
			index++;
		}

		return this;
	};

	/**
	 * Move an item from its current position to a new index.
	 *
	 * The item is expected to exist in the list. If it doesn't,
	 * the method will throw an exception.
	 *
	 * @private
	 * @param {OO.EventEmitter} item Items to add
	 * @param {number} newIndex Index to move the item to
	 * @return {number} The index the item was moved to
	 * @throws {Error} If item is not in the list
	 */
	OO.EmitterList.prototype.moveItem = function ( item, newIndex ) {
		var existingIndex = this.items.indexOf( item );

		if ( existingIndex === -1 ) {
			throw new Error( 'Item cannot be moved, because it is not in the list.' );
		}

		newIndex = normalizeArrayIndex( this.items, newIndex );

		// Remove the item from the current index
		this.items.splice( existingIndex, 1 );

		// If necessary, adjust new index after removal
		if ( existingIndex < newIndex ) {
			newIndex--;
		}

		// Move the item to the new index
		this.items.splice( newIndex, 0, item );

		return newIndex;
	};

	/**
	 * Utility method to insert an item into the list, and
	 * connect it to aggregate events.
	 *
	 * Don't call this directly unless you know what you're doing.
	 * Use #addItems instead.
	 *
	 * This method can be extended in child classes to produce
	 * different behavior when an item is inserted. For example,
	 * inserted items may also be attached to the DOM or may
	 * interact with some other nodes in certain ways. Extending
	 * this method is allowed, but if overridden, the aggregation
	 * of events must be preserved, or behavior of emitted events
	 * will be broken.
	 *
	 * If you are extending this method, please make sure the
	 * parent method is called.
	 *
	 * @protected
	 * @param {OO.EventEmitter|Object} item Item to add
	 * @param {number} index Index to add items at
	 * @return {number} The index the item was added at
	 */
	OO.EmitterList.prototype.insertItem = function ( item, index ) {
		// Throw an error if null or item is not an object.
		if ( item === null || typeof item !== 'object' ) {
			throw new Error( 'Expected object, but item is ' + typeof item );
		}

		// Add the item to event aggregation
		if ( item.connect && item.disconnect ) {
			var events = {};
			for ( var event in this.aggregateItemEvents ) {
				events[ event ] = [ 'emit', this.aggregateItemEvents[ event ], item ];
			}
			item.connect( this, events );
		}

		index = normalizeArrayIndex( this.items, index );

		// Insert into items array
		this.items.splice( index, 0, item );
		return index;
	};

	/**
	 * Remove items.
	 *
	 * @param {OO.EventEmitter|OO.EventEmitter[]} items Items to remove
	 * @return {OO.EmitterList}
	 * @fires OO.EmitterList#remove
	 */
	OO.EmitterList.prototype.removeItems = function ( items ) {
		if ( !Array.isArray( items ) ) {
			items = [ items ];
		}

		if ( items.length === 0 ) {
			return this;
		}

		// Remove specific items
		for ( var i = 0; i < items.length; i++ ) {
			var item = items[ i ];
			var index = this.items.indexOf( item );
			if ( index !== -1 ) {
				if ( item.connect && item.disconnect ) {
					// Disconnect all listeners from the item
					item.disconnect( this );
				}
				this.items.splice( index, 1 );
				this.emit( 'remove', item, index );
			}
		}

		return this;
	};

	/**
	 * Clear all items.
	 *
	 * @return {OO.EmitterList}
	 * @fires OO.EmitterList#clear
	 */
	OO.EmitterList.prototype.clearItems = function () {
		var cleared = this.items.splice( 0, this.items.length );

		// Disconnect all items
		for ( var i = 0; i < cleared.length; i++ ) {
			var item = cleared[ i ];
			if ( item.connect && item.disconnect ) {
				item.disconnect( this );
			}
		}

		this.emit( 'clear' );

		return this;
	};

}() );

/**
 * Manage a sorted list of OO.EmitterList objects.
 *
 * The sort order is based on a callback that compares two items. The return value of
 * callback( a, b ) must be less than zero if a < b, greater than zero if a > b, and zero
 * if a is equal to b. The callback should only return zero if the two objects are
 * considered equal.
 *
 * When an item changes in a way that could affect their sorting behavior, it must
 * emit the {@link OO.SortedEmitterList#event:itemSortChange itemSortChange} event.
 * This will cause it to be re-sorted automatically.
 *
 * This mixin must be used in a class that also mixes in {@link OO.EventEmitter}.
 *
 * @abstract
 * @class
 * @mixes OO.EmitterList
 * @param {Function} sortingCallback Callback that compares two items.
 */
OO.SortedEmitterList = function OoSortedEmitterList( sortingCallback ) {
	// Mixin constructors
	OO.EmitterList.call( this );

	this.sortingCallback = sortingCallback;

	// Listen to sortChange event and make sure
	// we re-sort the changed item when that happens
	this.aggregate( {
		sortChange: 'itemSortChange'
	} );

	this.connect( this, {
		itemSortChange: 'onItemSortChange'
	} );
};

OO.mixinClass( OO.SortedEmitterList, OO.EmitterList );

/* Events */

/**
 * An item has changed properties that affect its sort positioning
 * inside the list.
 *
 * @private
 * @event OO.SortedEmitterList#itemSortChange
 */

/* Methods */

/**
 * Handle a case where an item changed a property that relates
 * to its sorted order.
 *
 * @param {OO.EventEmitter} item Item in the list
 */
OO.SortedEmitterList.prototype.onItemSortChange = function ( item ) {
	// Remove the item
	this.removeItems( item );
	// Re-add the item so it is in the correct place
	this.addItems( item );
};

/**
 * Change the sorting callback for this sorted list.
 *
 * The callback receives two items. The return value of callback(a, b) must be less than zero
 * if a < b, greater than zero if a > b, and zero if a is equal to b.
 *
 * @param {Function} sortingCallback Sorting callback
 */
OO.SortedEmitterList.prototype.setSortingCallback = function ( sortingCallback ) {
	var items = this.getItems();

	this.sortingCallback = sortingCallback;

	// Empty the list
	this.clearItems();
	// Re-add the items in the new order
	this.addItems( items );
};

/**
 * Add items to the sorted list.
 *
 * @param {OO.EventEmitter|OO.EventEmitter[]} items Item to add or
 *  an array of items to add
 * @return {OO.SortedEmitterList}
 */
OO.SortedEmitterList.prototype.addItems = function ( items ) {
	if ( !Array.isArray( items ) ) {
		items = [ items ];
	}

	if ( items.length === 0 ) {
		return this;
	}

	for ( var i = 0; i < items.length; i++ ) {
		// Find insertion index
		var insertionIndex = this.findInsertionIndex( items[ i ] );

		// Check if the item exists using the sorting callback
		// and remove it first if it exists
		if (
			// First make sure the insertion index is not at the end
			// of the list (which means it does not point to any actual
			// items)
			insertionIndex <= this.items.length &&
			// Make sure there actually is an item in this index
			this.items[ insertionIndex ] &&
			// The callback returns 0 if the items are equal
			this.sortingCallback( this.items[ insertionIndex ], items[ i ] ) === 0
		) {
			// Remove the existing item
			this.removeItems( this.items[ insertionIndex ] );
		}

		// Insert item at the insertion index
		var index = this.insertItem( items[ i ], insertionIndex );
		this.emit( 'add', items[ i ], index );
	}

	return this;
};

/**
 * Find the index a given item should be inserted at. If the item is already
 * in the list, this will return the index where the item currently is.
 *
 * @param {OO.EventEmitter} item Items to insert
 * @return {number} The index the item should be inserted at
 */
OO.SortedEmitterList.prototype.findInsertionIndex = function ( item ) {
	var list = this;

	return OO.binarySearch(
		this.items,
		// Fake a this.sortingCallback.bind( null, item ) call here
		// otherwise this doesn't pass tests in phantomJS
		function ( otherItem ) {
			return list.sortingCallback( item, otherItem );
		},
		true
	);

};

/* global hasOwn */

/**
 * A map interface for associating arbitrary data with a symbolic name. Used in
 * place of a plain object to provide additional {@link OO.Registry#register registration}
 * or {@link OO.Registry#lookup lookup} functionality.
 *
 * See <https://www.mediawiki.org/wiki/OOjs/Registries_and_factories>.
 *
 * @class
 * @mixes OO.EventEmitter
 */
OO.Registry = function OoRegistry() {
	// Mixin constructors
	OO.EventEmitter.call( this );

	// Properties
	this.registry = {};
};

/* Inheritance */

OO.mixinClass( OO.Registry, OO.EventEmitter );

/* Events */

/**
 * @event OO.Registry#register
 * @param {string} name
 * @param {any} data
 */

/**
 * @event OO.Registry#unregister
 * @param {string} name
 * @param {any} data Data removed from registry
 */

/* Methods */

/**
 * Associate one or more symbolic names with some data.
 *
 * Any existing entry with the same name will be overridden.
 *
 * @param {string|string[]} name Symbolic name or list of symbolic names
 * @param {any} data Data to associate with symbolic name
 * @fires OO.Registry#register
 * @throws {Error} Name argument must be a string or array
 */
OO.Registry.prototype.register = function ( name, data ) {
	if ( typeof name === 'string' ) {
		this.registry[ name ] = data;
		this.emit( 'register', name, data );
	} else if ( Array.isArray( name ) ) {
		for ( var i = 0, len = name.length; i < len; i++ ) {
			this.register( name[ i ], data );
		}
	} else {
		throw new Error( 'Name must be a string or array, cannot be a ' + typeof name );
	}
};

/**
 * Remove one or more symbolic names from the registry.
 *
 * @param {string|string[]} name Symbolic name or list of symbolic names
 * @fires OO.Registry#unregister
 * @throws {Error} Name argument must be a string or array
 */
OO.Registry.prototype.unregister = function ( name ) {
	if ( typeof name === 'string' ) {
		var data = this.lookup( name );
		if ( data !== undefined ) {
			delete this.registry[ name ];
			this.emit( 'unregister', name, data );
		}
	} else if ( Array.isArray( name ) ) {
		for ( var i = 0, len = name.length; i < len; i++ ) {
			this.unregister( name[ i ] );
		}
	} else {
		throw new Error( 'Name must be a string or array, cannot be a ' + typeof name );
	}
};

/**
 * Get data for a given symbolic name.
 *
 * @param {string} name Symbolic name
 * @return {any|undefined} Data associated with symbolic name
 */
OO.Registry.prototype.lookup = function ( name ) {
	if ( hasOwn.call( this.registry, name ) ) {
		return this.registry[ name ];
	}
};

/**
 * @class
 * @extends OO.Registry
 */
OO.Factory = function OoFactory() {
	// Parent constructor
	OO.Factory.super.call( this );
};

/* Inheritance */

OO.inheritClass( OO.Factory, OO.Registry );

/* Methods */

/**
 * Register a class with the factory.
 *
 *     function MyClass() {};
 *     OO.initClass( MyClass );
 *     MyClass.key = 'hello';
 *
 *     // Register class with the factory
 *     factory.register( MyClass );
 *
 *     // Instantiate a class based on its registered key (also known as a "symbolic name")
 *     factory.create( 'hello' );
 *
 * @param {Function} constructor Class to use when creating an object
 * @param {string} [key] The key for #create().
 *  This parameter is usually omitted in favour of letting the class declare
 *  its own key, through `MyClass.key`.
 *  For backwards-compatiblity with OOjs 6.0 (2021) and older, it can also be declared
 *  via `MyClass.static.name`.
 * @throws {Error} If a parameter is invalid
 */
OO.Factory.prototype.register = function ( constructor, key ) {
	if ( typeof constructor !== 'function' ) {
		throw new Error( 'constructor must be a function, got ' + typeof constructor );
	}
	if ( arguments.length <= 1 ) {
		key = constructor.key || ( constructor.static && constructor.static.name );
	}
	if ( typeof key !== 'string' || key === '' ) {
		throw new Error( 'key must be a non-empty string' );
	}

	// Parent method
	OO.Factory.super.prototype.register.call( this, key, constructor );
};

/**
 * Unregister a class from the factory.
 *
 * @param {string|Function} key Constructor function or key to unregister
 * @throws {Error} If a parameter is invalid
 */
OO.Factory.prototype.unregister = function ( key ) {
	if ( typeof key === 'function' ) {
		key = key.key || ( key.static && key.static.name );
	}
	if ( typeof key !== 'string' || key === '' ) {
		throw new Error( 'key must be a non-empty string' );
	}

	// Parent method
	OO.Factory.super.prototype.unregister.call( this, key );
};

/**
 * Create an object based on a key.
 *
 * The key is used to look up the class to use, with any subsequent arguments passed to the
 * constructor function.
 *
 * @param {string} key Class key
 * @param {...any} [args] Arguments to pass to the constructor
 * @return {Object} The new object
 * @throws {Error} Unknown key
 */
OO.Factory.prototype.create = function ( key, ...args ) {
	var constructor = this.lookup( key );
	if ( !constructor ) {
		throw new Error( 'No class registered by that key: ' + key );
	}

	return new constructor( ...args );
};

/* eslint-env node */

/* istanbul ignore next */
if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = OO;
} else {
	global.OO = OO;
}

}( this ) );

/*!
 * VisualEditor HashValueStore class.
 *
 * @copyright See AUTHORS.txt
 */

/* global SparkMD5 */

/**
 * Ordered append-only hash store, whose values once inserted are immutable
 *
 * Values are objects, strings or Arrays, and are hashed using an algorithm with low collision
 * probability: values with the same hash can be assumed equal.
 *
 * Values are stored in insertion order, and the store can be sliced to get a subset of values
 * inserted consecutively.
 *
 * Two stores can be merged even if they have differently computed hashes, so long as two values
 * will (with high probability) have the same hash only if equal. In this case, equivalent
 * values can have two different hashes.
 *
 * @class
 * @constructor
 * @param {Object[]} [values] Values to insert
 */
ve.dm.HashValueStore = function VeDmHashValueStore( values ) {
	// Maps hashes to values
	this.hashStore = {};
	// Hashes in order of insertion (used for slicing)
	this.hashes = [];
	if ( values ) {
		this.hashAll( values );
	}
};

/* Inheritance */

OO.initClass( ve.dm.HashValueStore );

/* Static Methods */

/**
 * Deserialize a store from a JSONable object
 *
 * @param {Function} deserializeValue Deserializer for arbitrary store values
 * @param {Object|null} data Store serialized as a JSONable object
 * @return {ve.dm.HashValueStore} Deserialized store
 */
ve.dm.HashValueStore.static.deserialize = function ( deserializeValue, data ) {
	const store = new ve.dm.HashValueStore();

	if ( !data ) {
		return store;
	}

	store.hashes = data.hashes.slice();
	store.hashStore = {};
	for ( const hash in data.hashStore ) {
		store.hashStore[ hash ] = deserializeValue( data.hashStore[ hash ] );
	}
	return store;
};

/* Methods */

/**
 * Serialize the store into a JSONable object
 *
 * @param {Function} serializeValue Serializer for arbitrary store values
 * @return {Object|null} Serialized store, null if empty
 */
ve.dm.HashValueStore.prototype.serialize = function ( serializeValue ) {
	const serialized = {};

	for ( const hash in this.hashStore ) {
		serialized[ hash ] = serializeValue( this.hashStore[ hash ] );
	}
	return this.getLength() ? {
		hashes: this.hashes.slice(),
		hashStore: serialized
	} : null;
};

/**
 * Get the number of values in the store
 *
 * @return {number} Number of values in the store
 */
ve.dm.HashValueStore.prototype.getLength = function () {
	return this.hashes.length;
};

ve.dm.HashValueStore.prototype.truncate = function ( start ) {
	const removedHashes = this.hashes.splice( start );
	removedHashes.forEach( ( hash ) => {
		delete this.hashStore[ hash ];
	} );
};

/**
 * Return a new store containing a slice of the values in insertion order
 *
 * @param {number} [start] Include values from position start onwards (default: 0)
 * @param {number} [end] Include values to position end exclusive (default: slice to end)
 * @return {ve.dm.HashValueStore} Slice of the current store (with non-cloned value references)
 */
ve.dm.HashValueStore.prototype.slice = function ( start, end ) {
	const sliced = new this.constructor();

	sliced.hashes = this.hashes.slice( start, end );
	sliced.hashes.forEach( ( hash ) => {
		sliced.hashStore[ hash ] = this.hashStore[ hash ];
	} );
	return sliced;
};

/**
 * Clone a store.
 *
 * @deprecated Use #slice with no arguments.
 * @return {ve.dm.HashValueStore} New store with the same contents as this one
 */
ve.dm.HashValueStore.prototype.clone = function () {
	return this.slice();
};

/**
 * Insert a value into the store
 *
 * @param {Object|string|Array} value Value to store
 * @param {string} [stringified] Stringified version of value; default OO.getHash( value )
 * @return {string} Hash value with low collision probability
 */
ve.dm.HashValueStore.prototype.hash = function ( value, stringified ) {
	const hash = this.hashOfValue( value, stringified );

	if ( !this.hashStore[ hash ] ) {
		if ( Array.isArray( value ) ) {
			this.hashStore[ hash ] = ve.copy( value );
		} else if ( value !== null && typeof value === 'object' ) {
			this.hashStore[ hash ] = ve.cloneObject( value );
		} else {
			this.hashStore[ hash ] = value;
		}
		this.hashes.push( hash );
	}

	return hash;
};

/**
 * Replace a value's stored hash, e.g. if the value has changed and you want to discard the old one.
 *
 * @param {string} oldHash The value's previously stored hash
 * @param {Object|string|Array} value New value
 * @throws {Error} Old hash not found
 * @return {string} New hash
 */
ve.dm.HashValueStore.prototype.replaceHash = function ( oldHash, value ) {
	const newHash = this.hashOfValue( value );

	if ( !Object.prototype.hasOwnProperty.call( this.hashStore, oldHash ) ) {
		throw new Error( 'Old hash not found: ' + oldHash );
	}

	delete this.hashStore[ oldHash ];

	if ( this.hashStore[ newHash ] === undefined ) {
		this.hashStore[ newHash ] = value;
		this.hashes.splice( this.hashes.indexOf( oldHash ), 1, newHash );
	}

	return newHash;
};

/**
 * Get the hash of a value without inserting it in the store
 *
 * @param {Object|string|Array} value Value to hash
 * @param {string} [stringified] Stringified version of value; default OO.getHash( value )
 * @return {string} Hash value with low collision probability
 */
ve.dm.HashValueStore.prototype.hashOfValue = function ( value, stringified ) {
	if ( typeof stringified !== 'string' ) {
		stringified = OO.getHash( value );
	}

	// We don't need cryptographically strong hashes, just low collision probability. Given
	// effectively random hash distribution, for n values hashed into a space of m hash
	// strings, the probability of a collision is roughly n^2 / (2m). We use 16 hex digits
	// of MD5 i.e. 2^64 possible hash strings, so given 2^16 stored values the collision
	// probability is about 2^-33 =~ 0.0000000001 , i.e. negligible.
	//
	// Prefix with a letter to prevent all numeric hashes, and to constrain the space of
	// possible object property values.
	return 'h' + SparkMD5.hash( stringified ).slice( 0, 16 );
};

/**
 * Get the hashes of values in the store
 *
 * Same as hash but with arrays.
 *
 * @param {Object[]} values Values to lookup or store
 * @return {string[]} The hashes of the values in the store
 */
ve.dm.HashValueStore.prototype.hashAll = function ( values ) {
	return values.map( ( value ) => this.hash( value ) );
};

/**
 * Get the value stored for a particular hash
 *
 * @param {string} hash Hash to look up
 * @return {Object|undefined} Value stored for this hash if present, else undefined
 */
ve.dm.HashValueStore.prototype.value = function ( hash ) {
	return this.hashStore[ hash ];
};

/**
 * Get the values stored for a list of hashes
 *
 * Same as value but with arrays.
 *
 * @param {string[]} hashes Hashes to lookup
 * @return {Array} Values for these hashes (undefined for any not present)
 */
ve.dm.HashValueStore.prototype.values = function ( hashes ) {
	return hashes.map( ( hash ) => this.value( hash ) );
};

/**
 * Merge another store into this store.
 *
 * It is allowed for the two stores to have differently computed hashes, so long as two values
 * will (with high probability) have the same hash only if equal. In this case, equivalent
 * values can have two different hashes.
 *
 * Values are added in the order they appear in the other store. Objects added to the store are
 * added by reference, not cloned, unlike in .hash()
 *
 * @param {ve.dm.HashValueStore} other Store to merge into this one
 */
ve.dm.HashValueStore.prototype.merge = function ( other ) {
	if ( other === this ) {
		return;
	}

	other.hashes.forEach( ( hash ) => {
		if ( !Object.prototype.hasOwnProperty.call( this.hashStore, hash ) ) {
			this.hashStore[ hash ] = other.hashStore[ hash ];
			this.hashes.push( hash );
		}
	} );
};

/**
 * Clone this store excluding certain values, like a set difference operation
 *
 * @param {ve.dm.HashValueStore|Object} omit Store of values to omit, or object whose keys are hashes to emit
 * @return {ve.dm.HashValueStore} All values in this that do not appear in other
 */
// eslint-disable-next-line es-x/no-set-prototype-difference
ve.dm.HashValueStore.prototype.difference = function ( omit ) {
	const store = new this.constructor();

	if ( omit instanceof ve.dm.HashValueStore ) {
		omit = omit.hashStore;
	}
	this.hashes.forEach( ( hash ) => {
		if ( !Object.prototype.hasOwnProperty.call( omit, hash ) ) {
			store.hashes.push( hash );
			store.hashStore[ hash ] = this.hashStore[ hash ];
		}
	} );
	return store;
};

/*!
 * VisualEditor DataModel Transaction class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * Transaction on ve.dm.LinearData, preserving ve.dm.Document tree validity
 *
 * A transaction represents a mapping on ve.dm.LinearData, from one state (the start
 * state) to another (the end state). The transaction is guaranteed not to break tree validity:
 * if the start state represents a syntactically valid ve.dm.Document tree (without unbalanced
 * tags, bare listItems, bare table cells etc), then the end state tree must be syntactically
 * valid too.
 *
 * A transaction is comprised of a list of operations, which must preserve tree validity as a
 * whole, though each individual operation may not. For example, a DivNode wrapping can be
 * removed by one operation removing the 'div' and another removing the '/div'.  The
 * ve.dm.TransactionBuilder.static.newFrom* methods help build transactions that preserve tree validity.
 *
 * @class
 * @constructor
 * @param {Object[]} [operations=[]] Operations preserving tree validity as a whole
 * @param {number|null} [authorId=null] Positive integer author ID; default null
 */
ve.dm.Transaction = function VeDmTransaction( operations = [], authorId = null ) {
	this.operations = operations || [];
	// TODO: remove this backwards-incompatibility check
	this.operations.forEach( ( op ) => {
		if ( op.type && /meta/i.test( op.type ) ) {
			throw new Error( 'Metadata ops are no longer supported' );
		}
	} );
	this.applied = false;
	this.authorId = authorId;
	this.isReversed = false;
};

/* Inheritance */

OO.initClass( ve.dm.Transaction );

/* Static Properties */

/**
 * Specification for how each type of operation should be reversed.
 *
 * This object maps operation types to objects, which map property names to reversal instructions.
 * A reversal instruction is either a string (which means the value of that property should be used)
 * or an object (which maps old values to new values). For instance, { from: 'to' }
 * means that the .from property of the reversed operation should be set to the .to property of the
 * original operation, and { method: { set: 'clear' } } means that if the .method property of
 * the original operation was 'set', the reversed operation's .method property should be 'clear'.
 *
 * If a property's treatment isn't specified, its value is simply copied without modification.
 * If an operation type's treatment isn't specified, all properties are copied without modification.
 *
 * @type {Object.<string,Object>}
 */
ve.dm.Transaction.static.reversers = {
	attribute: { from: 'to', to: 'from' }, // Swap .from with .to
	replace: { // Swap .insert with .remove
		insert: 'remove',
		remove: 'insert'
	}
};

/* Static Methods */

/**
 * Deserialize a transaction from a JSONable object
 *
 * Values are either new or deep copied, so there is no reference into the serialized structure
 *
 * @param {Object|Array} data Transaction serialized as a JSONable object
 * @return {ve.dm.Transaction} Deserialized transaction
 */
ve.dm.Transaction.static.deserialize = function ( data ) {
	function deminifyLinearData( element ) {
		if ( typeof element === 'string' ) {
			return element.split( '' );
		}
		// Else deep copy. For this plain, serializable array, stringify+parse profiles
		// faster than ve.copy
		return JSON.parse( JSON.stringify( element ) );
	}

	function deminify( op ) {
		if ( typeof op === 'number' ) {
			return { type: 'retain', length: op };
		}
		if ( Array.isArray( op ) ) {
			return {
				type: 'replace',
				remove: deminifyLinearData( op[ 0 ] ),
				insert: deminifyLinearData( op[ 1 ] )
			};
		}
		// Else deep copy. For this plain, serializable array, stringify+parse profiles
		// faster than ve.copy
		return JSON.parse( JSON.stringify( op ) );
	}

	if ( Array.isArray( data ) ) {
		return new ve.dm.Transaction(
			data.map( deminify )
		);
	} else {
		return new ve.dm.Transaction(
			// operations
			data.o.map( deminify ),
			// authorId
			data.a
		);
	}
};

/**
 * Simpified comparison of linear data items
 *
 * Identical to ve.dm.LinearData.static.compareElementsUnannotated, but without
 * the complex comparison of node elements that requires the model registry.
 *
 * For the purposes of translateOffset it is just sufficient that we catch obvious
 * cases of annotations being set/clear.
 *
 * @param {ve.dm.LinearData.Item} a First item
 * @param {ve.dm.LinearData.Item} b Second item
 * @return {boolean} Elements are comparable
 */
ve.dm.Transaction.static.compareElementsForTranslate = function ( a, b ) {
	let aPlain = a,
		bPlain = b;

	if ( a === b ) {
		return true;
	}

	if ( Array.isArray( a ) ) {
		aPlain = a[ 0 ];
	}
	if ( Array.isArray( b ) ) {
		bPlain = b[ 0 ];
	}
	if ( typeof aPlain === 'string' && typeof bPlain === 'string' ) {
		return aPlain === bPlain;
	}

	if ( typeof a !== typeof b ) {
		// Different types
		return false;
	}

	// By this point, both must be objects, so must have equal types
	if ( a.type !== b.type ) {
		return false;
	}

	// Elements of the same type, consider them equal for the purpose of offset translation
	return true;
};

/**
 * Check if an operation only changes annotations
 *
 * @param {Object} op Operation object
 * @return {boolean} Operation is annotation-only
 */
ve.dm.Transaction.static.isAnnotationOnlyOperation = function ( op ) {
	return op.type === 'replace' &&
		op.insert.length === op.remove.length &&
		op.insert.every( ( insert, j ) => ve.dm.Transaction.static.compareElementsForTranslate( insert, op.remove[ j ] ) );
};

/* Methods */

/**
 * Serialize the transaction into a JSONable object
 *
 * Values are not necessarily deep copied
 *
 * @param {string} [key] Key in parent object
 * @return {Object|Array} JSONable object
 */
ve.dm.Transaction.prototype.toJSON = function () {
	function isSingleCodePoint( x ) {
		return typeof x === 'string' && x.length === 1;
	}
	function minifyLinearData( data ) {
		if ( data.every( isSingleCodePoint ) ) {
			return data.join( '' );
		}
		return data;
	}

	function minify( op ) {
		if ( op.type === 'retain' ) {
			return op.length;
		}
		if (
			op.type === 'replace' &&
			!op.insertedDataOffset &&
			(
				op.insertedDataLength === undefined ||
				op.insertedDataLength === op.insert.length
			)
		) {
			return [ minifyLinearData( op.remove ), minifyLinearData( op.insert ) ];
		}
		return op;
	}

	const operations = this.operations.map( minify );

	if ( this.authorId !== null ) {
		return {
			o: operations,
			a: this.authorId
		};
	} else {
		return operations;
	}
};

// Deprecated alias
ve.dm.Transaction.prototype.serialize = ve.dm.Transaction.prototype.toJSON;

/**
 * Push a retain operation
 *
 * @param {number} length Length > 0 of content data to retain
 */
ve.dm.Transaction.prototype.pushRetainOp = function ( length ) {
	this.operations.push( { type: 'retain', length } );
};

/**
 * Build an attribute operation
 *
 * @param {string} key Name of attribute to change
 * @param {any} from Value to change attribute from, or undefined if not previously set
 * @param {any} to Value to change attribute to, or undefined to remove
 */
ve.dm.Transaction.prototype.pushAttributeOp = function ( key, from, to ) {
	this.operations.push( { type: 'attribute', key, from, to } );
};

/**
 * Create a clone of this transaction.
 *
 * The returned transaction will be exactly the same as this one, except that its 'applied' flag
 * will be cleared. This means that if a transaction has already been committed, it will still
 * be possible to commit the clone. This is used for redoing transactions that were undone.
 *
 * @return {ve.dm.Transaction} Clone of this transaction
 */
ve.dm.Transaction.prototype.clone = function () {
	return new this.constructor(
		// For this plain, serializable array, stringify+parse profiles faster than ve.copy
		JSON.parse( JSON.stringify( this.operations ) ),
		this.authorId
	);
};

/**
 * Create a reversed version of this transaction.
 *
 * The returned transaction will be the same as this one but with all operations reversed. This
 * means that applying the original transaction and then applying the reversed transaction will
 * result in no net changes. This is used to undo transactions.
 *
 * @return {ve.dm.Transaction} Reverse of this transaction
 */
ve.dm.Transaction.prototype.reversed = function () {
	const reversedOps = this.operations.map( ( op ) => {
		const newOp = ve.copy( op );
		const reverse = this.constructor.static.reversers[ op.type ] || {};
		for ( const prop in reverse ) {
			if ( typeof reverse[ prop ] === 'string' ) {
				newOp[ prop ] = op[ reverse[ prop ] ];
			} else {
				newOp[ prop ] = reverse[ prop ][ op[ prop ] ];
			}
		}
		return newOp;
	} );
	const tx = new this.constructor( reversedOps, this.authorId );
	tx.isReversed = !this.isReversed;
	return tx;
};

/**
 * Check if the transaction would make any actual changes if processed.
 *
 * There may be more sophisticated checks that can be done, like looking for things being replaced
 * with identical content, but such transactions probably should not be created in the first place.
 *
 * @return {boolean} Transaction is no-op
 */
ve.dm.Transaction.prototype.isNoOp = function () {
	if ( this.operations.length === 0 ) {
		return true;
	}
	if ( this.operations.length === 1 ) {
		return this.operations[ 0 ].type === 'retain';
	}
	return false;
};

/**
 * Get all operations.
 *
 * @return {Object[]} List of operations
 */
ve.dm.Transaction.prototype.getOperations = function () {
	return this.operations;
};

/**
 * Check if the transaction has any operations with a certain type.
 *
 * @param {string} type Operation type
 * @return {boolean} Has operations of a given type
 */
ve.dm.Transaction.prototype.hasOperationWithType = function ( type ) {
	return this.operations.some( ( op ) => op.type === type );
};

/**
 * Check if the transaction has any content data operations, such as insertion or deletion.
 *
 * @return {boolean} Has content data operations
 */
ve.dm.Transaction.prototype.hasContentDataOperations = function () {
	return this.hasOperationWithType( 'replace' );
};

/**
 * Check if the transaction has any element attribute operations.
 *
 * @return {boolean} Has element attribute operations
 */
ve.dm.Transaction.prototype.hasElementAttributeOperations = function () {
	return this.hasOperationWithType( 'attribute' );
};

/**
 * Check whether the transaction has already been applied.
 *
 * @return {boolean}
 */
ve.dm.Transaction.prototype.hasBeenApplied = function () {
	return this.applied;
};

/**
 * Mark the transaction as having been applied.
 *
 * Should only be called after committing the transaction.
 *
 * @see ve.dm.Transaction#hasBeenApplied
 */
ve.dm.Transaction.prototype.markAsApplied = function () {
	this.applied = true;
};

/**
 * Translate an offset based on a transaction.
 *
 * This is useful when you want to anticipate what an offset will be after a transaction is
 * processed.
 *
 * @param {number} offset Offset in the linear model before the transaction has been processed
 * @param {boolean} [excludeInsertion] Map the offset immediately before an insertion to
 *  right before the insertion rather than right after
 * @return {number} Translated offset, as it will be after processing transaction
 */
ve.dm.Transaction.prototype.translateOffset = function ( offset, excludeInsertion ) {
	let cursor = 0,
		adjustment = 0;

	for ( let i = 0; i < this.operations.length; i++ ) {
		const op = this.operations[ i ];
		// If a 'replace' only changes annotations, treat it like a 'retain'
		// This imitates the behaviour of the old 'annotate' operation type.
		if ( op.type === 'retain' || ve.dm.Transaction.static.isAnnotationOnlyOperation( op ) ) {
			const retainLength = op.type === 'retain' ? op.length : op.remove.length;
			if ( offset >= cursor && offset < cursor + retainLength ) {
				return offset + adjustment;
			}
			cursor += retainLength;
			continue;
		} else if ( op.type === 'replace' ) {
			const insertLength = op.insert.length;
			const removeLength = op.remove.length;
			const prevAdjustment = adjustment;
			adjustment += insertLength - removeLength;
			if ( offset === cursor + removeLength ) {
				// Offset points to right after the removal or right before the insertion
				if ( excludeInsertion && insertLength > removeLength ) {
					// Translate it to before the insertion
					return offset + adjustment - insertLength + removeLength;
				} else {
					// Translate it to after the removal/insertion
					return offset + adjustment;
				}
			} else if ( offset === cursor ) {
				// The offset points to right before the removal or replacement
				if ( insertLength === 0 ) {
					// Translate it to after the removal
					return cursor + removeLength + adjustment;
				} else {
					// Translate it to before the replacement
					// To translate this correctly, we have to use adjustment as it was before
					// we adjusted it for this replacement
					return cursor + prevAdjustment;
				}
			} else if ( offset > cursor && offset < cursor + removeLength ) {
				// The offset points inside of the removal
				// Translate it to after the removal
				return cursor + removeLength + adjustment;
			}
			cursor += removeLength;
		}
	}
	return offset + adjustment;
};

/**
 * Translate a range based on the transaction, with grow/shrink preference at changes
 *
 * This is useful when you want to anticipate what a selection will be after a transaction is
 * processed.
 *
 * @see #translateOffset
 * @param {ve.Range} range Range in the linear model before the transaction has been processed
 * @param {boolean} [excludeInsertion] Do not grow the range to cover insertions
 *  on the boundaries of the range.
 * @return {ve.Range} Translated range, as it will be after processing transaction
 */
ve.dm.Transaction.prototype.translateRange = function ( range, excludeInsertion ) {
	const start = this.translateOffset( range.start, !excludeInsertion ),
		end = this.translateOffset( range.end, excludeInsertion );
	return range.isBackwards() ? new ve.Range( end, start ) : new ve.Range( start, end );
};

/**
 * Translate a range based on the transaction, with bias depending on author ID comparison
 *
 * Biases backward if !authorId || !this.authorId || authorId <= this.authorId
 *
 * @see #translateOffset
 * @param {ve.Range} range Range in the linear model before the transaction has been processed
 * @param {number} [authorId] Author ID of the range
 * @return {ve.Range} Translated range, as it will be after processing transaction
 */
ve.dm.Transaction.prototype.translateRangeWithAuthor = function ( range, authorId ) {
	const backward = !this.authorId || !authorId || authorId < this.authorId,
		start = this.translateOffset( range.start, backward ),
		end = this.translateOffset( range.end, backward );
	return range.isBackwards() ? new ve.Range( end, start ) : new ve.Range( start, end );
};

/**
 * Get the range that covers modifications made by this transaction.
 *
 * In the case of insertions, the range covers content the user intended to insert.
 * It ignores wrappers added by ve.dm.Document#fixUpInsertion.
 *
 * The returned range is relative to the new state, after the transaction is applied. So for a
 * simple insertion transaction, the range will cover the newly inserted data, and for a simple
 * removal transaction it will be a zero-length range.
 *
 * @param {ve.dm.Document} doc The document in the state to which the transaction applies
 * @param {Object} [options] Options
 * @param {boolean} [options.includeInternalList] Include changes within the internal list
 * @param {boolean} [options.excludeAnnotations] Exclude annotation-only changes
 * @param {boolean} [options.excludeAttributes] Exclude attribute changes
 * @return {ve.Range|null} Range covering modifications, or null for a no-op transaction
 */
ve.dm.Transaction.prototype.getModifiedRange = function ( doc, options = {} ) {
	let docEndOffset = doc.data.getLength(),
		oldOffset = 0,
		offset = 0;

	if ( !options.includeInternalList ) {
		const internalListNode = doc.getInternalList().getListNode();
		if ( internalListNode ) {
			docEndOffset = internalListNode.getOuterRange().start;
		}
	}

	let start, end;
	opLoop:
	for ( let i = 0; i < this.operations.length; i++ ) {
		const op = this.operations[ i ];
		switch ( op.type ) {
			case 'retain':
				if ( oldOffset + op.length > docEndOffset ) {
					break opLoop;
				}
				offset += op.length;
				oldOffset += op.length;
				break;

			case 'attribute':
				if ( options.excludeAttributes ) {
					break;
				}
				if ( start === undefined ) {
					start = offset;
				}
				// Attribute changes modify the element to their right but don't move the cursor
				end = offset + 1;
				break;

			default:
				if ( options.excludeAnnotations && this.constructor.static.isAnnotationOnlyOperation( op ) ) {
					// Treat as 'retain'
					if ( oldOffset + op.length > docEndOffset ) {
						break opLoop;
					}
					offset += op.length;
					oldOffset += op.length;
					break;
				}
				if ( start === undefined ) {
					// This is the first non-retain operation, set start to right before it
					start = offset + ( op.insertedDataOffset || 0 );
				}
				if ( op.type === 'replace' ) {
					offset += op.insert.length;
					oldOffset += op.remove.length;
				}

				// Set end, so it'll end up being right after the last non-retain operation
				if ( op.insertedDataLength ) {
					end = start + op.insertedDataLength;
				} else {
					end = offset;
				}
				break;
		}
	}
	if ( start === undefined || end === undefined ) {
		// No-op transaction
		return null;
	}
	return new ve.Range( start, end );
};

/**
 * @typedef {Object} RangeAndLengthDiff
 * @memberof ve.dm.Transaction
 * @property {number} [start] Start offset of the active range
 * @property {number} [end] End offset of the active range
 * @property {number} [startOpIndex] Start operation index of the active range
 * @property {number} [endOpIndex] End operation index of the active range
 * @property {number} diff Length change the transaction causes
 */

/**
 * Calculate active range and length change
 *
 * @return {ve.dm.Transaction.RangeAndLengthDiff} Active range and length change
 */
ve.dm.Transaction.prototype.getActiveRangeAndLengthDiff = function () {
	let offset = 0,
		diff = 0;

	let start, end, startOpIndex, endOpIndex;
	for ( let i = 0; i < this.operations.length; i++ ) {
		const op = this.operations[ i ];
		const active = op.type !== 'retain';
		// Place start marker
		if ( active && start === undefined ) {
			start = offset;
			startOpIndex = i;
		}
		// Adjust offset and diff
		if ( op.type === 'retain' ) {
			offset += op.length;
		} else if ( op.type === 'replace' ) {
			offset += op.remove.length;
			diff += op.insert.length - op.remove.length;
		}
		// Place/move end marker
		if ( op.type === 'attribute' || op.type === 'replaceMetadata' ) {
			// Op with length 0 but that effectively modifies 1 position
			end = offset + 1;
			endOpIndex = i + 1;
		} else if ( active ) {
			end = offset;
			endOpIndex = i + 1;
		}
	}
	return {
		start,
		end,
		startOpIndex,
		endOpIndex,
		diff
	};
};

// TODO: Use adjustRetain to replace ve.dm.TransactionBuilder#pushRetain

/**
 * Adjust (in place) the retain length at the start/end of an operations list
 *
 * @param {string} place Where to adjust, start|end
 * @param {number} diff Adjustment; must not cause negative retain length
 */
ve.dm.Transaction.prototype.adjustRetain = function ( place, diff ) {
	if ( diff === 0 ) {
		return;
	}

	const start = place === 'start',
		ops = this.operations;
	let i = start ? 0 : ops.length - 1;

	if ( !start && ops[ i ] && ops[ i ].type === 'retainMetadata' ) {
		i = ops.length - 2;
	}
	if ( ops[ i ] && ops[ i ].type === 'retain' ) {
		ops[ i ].length += diff;
		if ( ops[ i ].length < 0 ) {
			throw new Error( 'Negative retain length' );
		} else if ( ops[ i ].length === 0 ) {
			ops.splice( i, 1 );
		}
		return;
	}
	if ( diff < 0 ) {
		throw new Error( 'Negative retain length' );
	}
	ops.splice( start ? 0 : ops.length, 0, { type: 'retain', length: diff } );
};

/*!
 * VisualEditor DataModel Change class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * DataModel change.
 *
 * A change is a list of transactions to be applied sequentially on top of a certain history
 * state, together with a set that includes all new store values (annotations and DOM elements)
 * introduced by those transactions.
 *
 * It can be thought of more abstractly as a function f: D1 -> D2 a document in a
 * specific start state D1, modifying parts of the document to produce a specific end state D2.
 *
 * For two changes f: D1 -> D2 and g: D2 -> D3 we define f.concat(g): D1 -> D3 as the change
 * obtained by applying f then g. By associativity of functions,
 * a.concat(b.concat(c)) = a.concat(b).concat(c) for any consecutive changes a, b, c. Writing
 *
 * x * y := x.concat(y) ,
 *
 * we have a * (b * c) = (a * b) * c, so we can just write either as a * b * c.
 *
 * For a change f: D1 -> D2 we define f.reversed() as the change D2 -> D1 such that
 * f.concat(f.reversed()) is the identity change D1 -> D1. Writing
 *
 * inv(x) := x.reversed() ,
 *
 * we have f * inv(f) = the identity change on D1 .
 *
 * Given two changes f: D1 -> D2 and g: D1 -> D3 , We would like to define f.rebasedOnto(g)
 * ("f rebased onto g") as a change that maps D3 onto some D4: conceptually, it is f
 * modified so it can be applied after g. This is a useful concept because it allows changes
 * written in parallel to be sequenced into a linear order. However, for some changes there
 * is no reasonable way to do this; e.g. when f and g both change the same word to something
 * different. In this case we make f.rebasedOnto(g) return null and we say it conflicts.
 *
 * Given f: D1 -> D2 , g: D2 -> D3, and x: D1 -> D4, we give three guarantees about rebasing:
 *
 * 1. x.rebasedOnto(f) conflicts if and only if f.rebasedOnto(x) conflicts.
 * 2. If there is no conflict, f.concat(x.rebasedOnto(f)) equals x.concat(f.rebasedOnto(x)).
 * 3. If there is no conflict, x.rebasedOnto(f).rebasedOnto(g) equals x.rebasedOnto(f * g).
 *
 * We can consider a conflicting transaction starting at some document D to be 0: D->null,
 * and regard any two conflicting transactions starting at D to be equal, and just write 0
 * where D1 is clear from context. Then, writing
 *
 * x|y := x.rebasedOnto(y),
 *
 * we can write our guarantees. Given f: D1 -> D2 , g: D2 -> D3, and x: D1 -> D4:
 *
 * 1. Change conflict well definedness: x|f = 0 if and only if f|x = 0.
 * 2. Change commutativity: f * g|f equals g * f|g .
 * 3. Rebasing piecewise: if (x|f)|g != 0, then (x|f)|g equals x|(f * g) .
 *
 * These guarantees let us reorder non-conflicting changes without affecting the resulting
 * document. They also let us move in the inverse direction ("rebase under"), from sequential
 * changes to parallel ones, for if f: D1 -> D2 and g: D2 -> D3, then g|inv(f)
 * maps from D1 to some D4, and conceptually it is g modified to apply without f having been
 * applied.
 *
 * Note that rebasing piecewise is *not* equivalent for changes that conflict: if a change
 * conflicts f, it might not conflict with f*g. For example, if x|f = 0 then
 *
 * (x|f)|inv(f) = 0 but x|(f * inv(f)) = x.
 *
 * @class
 * @constructor
 * @param {number} [start=0] Length of the history stack at change start
 * @param {ve.dm.Transaction[]} [transactions] Transactions to apply
 * @param {ve.dm.HashValueStore[]} [stores] For each transaction, a collection of new store items
 * @param {Object} [selections={}] For each author ID (key), latest ve.dm.Selection
 */
ve.dm.Change = function VeDmChange( start = 0, transactions = [], stores = [], selections = {} ) {
	this.start = start;
	this.transactions = transactions;
	this.store = new ve.dm.HashValueStore();
	this.storeLengthAtTransaction = [];
	stores.forEach( ( store ) => {
		this.store.merge( store );
		this.storeLengthAtTransaction.push( this.store.getLength() );
	} );
	this.selections = selections;
};

/* Static methods */

ve.dm.Change.static = {};

/**
 * Deserialize a change from a JSONable object
 *
 * Store values can be deserialized, or kept verbatim; the latter is an optimization if the
 * Change object will be rebased and reserialized without ever being applied to a document.
 *
 * @param {Object} data Change serialized as a JSONable object
 * @param {boolean} [preserveStoreValues=false] Keep store values verbatim instead of deserializing
 * @param {boolean} [unsafe] Use unsafe deserialization (skipping DOMPurify), used via #unsafeDeserialize
 * @return {ve.dm.Change} Deserialized change
 */
ve.dm.Change.static.deserialize = function ( data, preserveStoreValues, unsafe ) {
	const hasOwn = Object.prototype.hasOwnProperty,
		getTransactionInfo = this.getTransactionInfo,
		deserializeValue = this.deserializeValue,
		selections = {},
		transactions = [],
		// If stores is undefined, create an array of nulls
		stores = data.stores || data.transactions.map( () => null );

	/**
	 * Apply annotations in-place to array of code units
	 *
	 * @param {string[]} items Array of code units
	 * @param {string[]|null} annotations Annotations to apply uniformly, or null
	 */
	function annotate( items, annotations ) {
		if ( !annotations || !annotations.length ) {
			return;
		}
		for ( let j = 0; j < items.length; j++ ) {
			items[ j ] = [ items[ j ], annotations.slice() ];
		}
	}

	for ( const authorId in data.selections ) {
		selections[ authorId ] = ve.dm.Selection.static.newFromJSON(
			data.selections[ authorId ]
		);
	}
	const deserializeStore = ve.dm.HashValueStore.static.deserialize.bind(
		null,
		preserveStoreValues ? ( x ) => x : ( x ) => deserializeValue( x, unsafe )
	);
	let prevInfo;
	for ( let i = 0; i < data.transactions.length; i++ ) {
		const txSerialized = data.transactions[ i ];
		let tx;
		if ( typeof txSerialized === 'string' ) {
			const insertion = txSerialized.split( '' );
			annotate(
				insertion,
				prevInfo.uniformInsert && prevInfo.uniformInsert.annotations
			);
			tx = new ve.dm.Transaction( [
				{ type: 'retain', length: prevInfo.end },
				{ type: 'replace', remove: [], insert: insertion },
				{ type: 'retain', length: prevInfo.docLength - prevInfo.end }
			], prevInfo.authorId );
			if ( tx.operations[ 2 ].length === 0 ) {
				tx.operations.pop();
			}
		} else {
			tx = ve.dm.Transaction.static.deserialize( txSerialized );
			if ( prevInfo && !hasOwn.call( txSerialized, 'authorId' ) ) {
				tx.authorId = prevInfo.authorId;
			}
		}
		transactions.push( tx );
		prevInfo = getTransactionInfo( tx );
	}
	return new ve.dm.Change(
		data.start,
		transactions,
		stores.map( deserializeStore ),
		selections
	);
};

/**
 * Deserialize a change from a JSONable object without sanitizing DOM nodes
 *
 * @param {Object} data
 * @return {ve.dm.Change} Deserialized change
 */
ve.dm.Change.static.unsafeDeserialize = function ( data ) {
	return this.deserialize( data, false, true );
};

/**
 * @param {any} value
 * @return {{type: string, value: any}}
 */
ve.dm.Change.static.serializeValue = function ( value ) {
	if ( value instanceof ve.dm.Annotation ) {
		return { type: 'annotation', value: value.element };
	} else if ( Array.isArray( value ) && value[ 0 ] instanceof Node ) {
		return { type: 'domNodes', value: value.map( ve.getNodeHtml ).join( '' ) };
	} else {
		return { type: 'plain', value };
	}
};

/**
 * @param {{type: string, value: any}} serialized
 * @param {boolean} unsafe
 * @return {any}
 */
ve.dm.Change.static.deserializeValue = function ( serialized, unsafe ) {
	if ( serialized.type === 'annotation' ) {
		return ve.dm.annotationFactory.createFromElement( serialized.value );
	} else if ( serialized.type === 'domNodes' ) {
		if ( unsafe ) {
			// We can use jQuery here because unsafe sanitization
			// only happens in browser clients.
			// eslint-disable-next-line no-undef
			return $.parseHTML( serialized.value, undefined, true );
		} else {
			// Convert NodeList to Array
			return Array.prototype.slice.call( ve.sanitizeHtml( serialized.value ) );
		}
	} else if ( serialized.type === 'plain' ) {
		return serialized.value;
	} else {
		throw new Error( 'Unrecognized type: ' + serialized.type );
	}
};

/**
 * Rebase parallel transactions transactionA and transactionB onto each other
 *
 * Recalling that a transaction is a mapping from one ve.dm.LinearData state to another,
 * suppose we have two parallel transactions, i.e.:
 *
 * - transactionA mapping docstate0 to some docstateA, and
 * - transactionB mapping docstate0 to some docstateB .
 *
 * Then we want rebasing to give us two new transactions:
 *
 * - aRebasedOntoB mapping docstateB to some docstateC, and
 * - bRebasedOntoA mapping docstateA to docstateC ,
 *
 * so that applying transactionA then bRebasedOntoA results in the same document state as
 * applying transactionB then aRebasedOntoB .
 *
 * However, it is useful to regard some transaction pairs as "conflicting" or unrebasable. In
 * this implementation, transactions are considered to conflict if they have active ranges that
 * overlap, where a transaction's "active range" means the smallest single range in the *start*
 * document outside which the contents are unchanged by the transaction. (In practice the
 * operations within the transaction actually specify which ranges map to where, giving a
 * natural and unambiguous definition of "active range". Also, the identity transaction on a
 * document state has no active range but is trivially rebasable with any parallel
 * transaction).
 *
 * For non-conflicting transactions, rebasing of each transaction is performed by resizing the
 * inactive range either before or after the transaction to accommodate the length difference
 * caused by the other transaction. There is ambiguity in the case where both transactions have
 * a zero-length active range at the same position (i.e. two inserts in the same place); in this
 * case, transactionA's insertion is put before transactionB's.
 *
 * It is impossible for rebasing defined this way to create an invalid transaction that breaks
 * tree validity. This is clear because every position in the rebased transaction's active
 * range has the same node ancestry as the corresponding position before the rebase (else a
 * tag must have changed both before and after that position, contradicting the fact that the
 * transactions' active ranges do not overlap).
 *
 * Also it is clear that for a pair of non-conflicting parallel transactions, applying either
 * one followed by the other rebased will result in the same final document state, as required.
 *
 * @param {ve.dm.Transaction} transactionA Transaction A
 * @param {ve.dm.Transaction} transactionB Transaction B, with the same document start state
 * @return {any[]} [ aRebasedOntoB, bRebasedOntoA ], or [ null, null ] if conflicting
 */
ve.dm.Change.static.rebaseTransactions = function ( transactionA, transactionB ) {
	transactionA = transactionA.clone();
	transactionB = transactionB.clone();
	const infoA = transactionA.getActiveRangeAndLengthDiff();
	const infoB = transactionB.getActiveRangeAndLengthDiff();

	if ( infoA.start === undefined || infoB.start === undefined ) {
		// One of the transactions is a no-op: only need to adjust its retain length.
		// We can safely adjust both, because the no-op must have diff 0
		transactionA.adjustRetain( 'start', infoB.diff );
		transactionB.adjustRetain( 'start', infoA.diff );
	} else if ( infoA.end <= infoB.start ) {
		// This includes the case where both transactions are insertions at the same
		// point
		transactionB.adjustRetain( 'start', infoA.diff );
		transactionA.adjustRetain( 'end', infoB.diff );
	} else if ( infoB.end <= infoA.start ) {
		transactionA.adjustRetain( 'start', infoB.diff );
		transactionB.adjustRetain( 'end', infoA.diff );
	} else {
		// The active ranges overlap: conflict
		return [ null, null ];
	}
	return [ transactionA, transactionB ];
};

/**
 * @typedef {Object} RebasedChange
 * @memberof ve.dm.Change
 * @property {ve.dm.Change} rebased Rebase onto history of uncommitted (or an initial segment of it)
 * @property {ve.dm.Change} transposedHistory Rebase of history onto initial segment of uncommitted
 * @property {ve.dm.Change|null} rejected Unrebasable final segment of uncommitted
 */

/**
 * Rebase a change on top of a parallel committed one
 *
 * Since a change is a stack of transactions, we define change rebasing in terms of transaction
 * rebasing. We require transaction rebasing to meet the three guarantees described above for
 * change rebasing. To be precise, given any transactions a:D1->D2, b:D2->D3 and x:D1->D4, we
 * require that:
 *
 * 1. Transaction conflict well definedness: a|x = 0 if and only if x|a = 0.
 * 2. Transaction commutativity: a * x|a equals x * a|x .
 * 3. Rebasing piecewise: if (x|a)|b != 0, then (x|a)|b equals x|(a * b) .
 *
 * Given committed history consisting of transactions a1,a2,…,aN, and an uncommitted update
 * consisting of transactions b1,b2,…,bM, our approach is to rebase the whole list a1,…,aN
 * over b1, and at the same time rebase b1 onto a1*…*aN.
 * Then we repeat the process for b2, and so on. To rebase a1,…,aN over b1, the following
 * approach would work:
 *
 * a1' := a1|b1
 * a2' := a2|(inv(a1) * b1 * a1')
 * a3' := a3|(inv(a2) * inv(a1) * b1 * a1' * a2')
 * ⋮
 *
 * That is, rebase a_i under a_i-1,…,a_1, then over b1,…,bM, then over a'1,…,a_i-1' .
 *
 * However, because of the way transactions are written, it's not actually easy to implement
 * transaction concatenation, so we would want to calculate a2' as piecewise rebases
 *
 * a2' = ((a2|inv(a1))|b1)|a1'
 *
 * which is unsatisfactory because a2|inv(a1) may well conflict even if a2|(inv(a1) * b1 * a1')
 * as a whole would not conflict (e.g. if b1 modifies only parts of the document distant from a1
 * and a2).
 *
 * So observe that by transaction commutivity we can rewrite a2' as:
 *
 * a2' := a2|(inv(a1) * a1 * b1|a1)
 *      = a2|(b1|a1)
 *
 * and that b1|a1 conflicts only if a1|b1 conflicts (so this introduces no new conflicts). In
 * general we can write:
 *
 * a1' := a1|b1
 * b1' := b1|a1
 * a2' := a2|b1'
 * b1'' := b1'|a2
 * a3' := a3|b1''
 * b1''' := a1''|a3
 *
 * Continuing in this way, we obtain a1',…,aN' rebased over b1, and b1''''''' (N primes)
 * rebased onto a1 * … * aN . Iteratively we can take the same approach to rebase over
 * b2,…,bM, giving both rebased lists as required.
 *
 * If any of the transaction rebases conflict, then we rebase the largest possible
 * non-conflicting initial segment b1,…,bK onto all of a1,…,aN (so clearly K < M).
 *
 * If there are two parallel inserts at the same location, then ordering is ambiguous. We
 * resolve this by putting the insert for the transaction with the highest author ID
 * first (Javascript less-than is used, so comparisons with a null author ID do not fail).
 * If the author IDs are the same, then A's insertion is put before B's.
 *
 * @param {ve.dm.Change} history Committed history
 * @param {ve.dm.Change} uncommitted New transactions, with same start as history
 * @return {ve.dm.Change.RebasedChange}
 */
ve.dm.Change.static.rebaseUncommittedChange = function ( history, uncommitted ) {
	if ( history.start !== uncommitted.start ) {
		throw new Error( 'Different starts: ' + history.start + ' and ' + uncommitted.start );
	}

	let transactionsA = history.transactions.slice();
	const transactionsB = uncommitted.transactions.slice();
	let storesA = history.getStores();
	const storesB = uncommitted.getStores();
	const selectionsA = OO.cloneObject( history.selections );
	let selectionsB = OO.cloneObject( uncommitted.selections );
	let rejected = null;

	// For each element b_i of transactionsB, rebase the whole list transactionsA over b_i.
	// To rebase a1, a2, a3, …, aN over b_i, first we rebase a1 onto b_i. Then we rebase
	// a2 onto some b', defined as
	//
	// b_i' := b_i|a1 , that is b_i.rebasedOnto(a1)
	//
	// (which as proven above is equivalent to inv(a1) * b_i * a1)
	//
	// Similarly we rebase a3 onto b_i'' := b_i'|a2, and so on.
	//
	// The rebased a_j are used for the transposed history: they will all get rebased over the
	// rest of transactionsB in the same way.
	// The fully rebased b_i forms the i'th element of the rebased transactionsB.
	//
	// If any rebase b_i|a_j fails, we stop rebasing at b_i (i.e. finishing with b_{i-1}).
	// We return
	// - rebased: (uncommitted sliced up to i) rebased onto history
	// - transposedHistory: history rebased onto (uncommitted sliced up to i)
	// - rejected: uncommitted sliced from i onwards
	bLoop:
	for ( let i = 0; i < transactionsB.length; i++ ) {
		let b = transactionsB[ i ];
		let storeB = storesB[ i ];
		const rebasedTransactionsA = [];
		const rebasedStoresA = [];
		for ( let j = 0; j < transactionsA.length; j++ ) {
			const a = transactionsA[ j ];
			const storeA = storesA[ j ];
			let rebases;
			if ( b.authorId < a.authorId ) {
				rebases = ve.dm.Change.static.rebaseTransactions( b, a ).reverse();
			} else {
				rebases = ve.dm.Change.static.rebaseTransactions( a, b );
			}
			if ( rebases[ 0 ] === null ) {
				rejected = uncommitted.mostRecent( uncommitted.start + i );
				transactionsB.length = i;
				storesB.length = i;
				selectionsB = {};
				break bLoop;
			}
			rebasedTransactionsA[ j ] = rebases[ 0 ];
			// eslint-disable-next-line es-x/no-set-prototype-difference
			rebasedStoresA[ j ] = storeA.difference( storeB );
			b = rebases[ 1 ];
			// eslint-disable-next-line es-x/no-set-prototype-difference
			storeB = storeB.difference( storeA );
		}
		transactionsA = rebasedTransactionsA;
		storesA = rebasedStoresA;
		transactionsB[ i ] = b;
		storesB[ i ] = storeB;
	}

	// Length calculations below assume no removal of empty rebased transactions
	const rebased = new ve.dm.Change(
		uncommitted.start + transactionsA.length,
		transactionsB,
		storesB,
		{}
	);
	const transposedHistory = new ve.dm.Change(
		history.start + transactionsB.length,
		transactionsA,
		storesA,
		{}
	);
	let authorId;
	for ( authorId in selectionsB ) {
		authorId = +authorId;
		rebased.selections[ authorId ] = selectionsB[ authorId ].translateByChange( transposedHistory, authorId );
	}
	for ( authorId in selectionsA ) {
		authorId = +authorId;
		transposedHistory.selections[ authorId ] = selectionsA[ authorId ].translateByChange( rebased, authorId );
	}
	return {
		rebased,
		transposedHistory,
		rejected
	};
};

/**
 * @typedef UniformTextInfo
 * @memberof ve.dm.Change
 * @property {string} text The code units, in a single string
 * @property {string} annotations Annotation hashes for all text
 * @property {string} annotationString Comma-separated annotation hashes
 */

/**
 * @typedef TransactionInfo
 * @memberof ve.dm.Change
 * @property {number} start The start offset of the replacement
 * @property {number} end The end offset of the replacement (after replacement)
 * @property {number} docLength The total length of the document (after replacement)
 * @property {number} authorId The author ID
 * @property {ve.dm.Change.UniformTextInfo|null} uniformInsert The insertion as uniform text, or null if not
 */

/**
 * Get info about a transaction if it is a "simple replacement", or null if not
 *
 * A simple replacement transaction is one that has just one retain op
 *
 * @param {ve.dm.Transaction} tx The transaction
 * @return {ve.dm.Change.TransactionInfo|null} Info about the transaction if a simple replacement, else null
 */
ve.dm.Change.static.getTransactionInfo = function ( tx ) {
	// Copy of ve.dm.LinearData.static.getAnnotationHashesFromItem, but we
	// don't want to load all of LinearData and its dependencies on the server-side.
	function getAnnotations( item ) {
		if ( typeof item === 'string' ) {
			return [];
		} else if ( item.annotations ) {
			return item.annotations.slice();
		} else if ( item[ 1 ] ) {
			return item[ 1 ].slice();
		} else {
			return [];
		}
	}

	/**
	 * Get an item's single code unit (without annotation), or null if not a code unit
	 *
	 * @param {Object|Array|string} item The item
	 * @return {string|null} The single code unit, or null if not a code unit
	 */
	function getSingleCodeUnit( item ) {
		if ( typeof item === 'string' && item.length === 1 ) {
			return item;
		}
		if ( Array.isArray( item ) && item[ 0 ].length === 1 ) {
			return item[ 0 ];
		}
		return null;
	}

	/**
	 * Get info about the "uniform text" from an item array, or null if not uniform text
	 *
	 * The item array is uniform text if all items have the same annotations, and
	 * every item is a single code unit of text
	 *
	 * @param {Array} items The items
	 * @return {ve.dm.Change.UniformTextInfo|null} Info about the uniform text, or null if not uniform text
	 */
	function getUniformText( items ) {
		const codeUnits = [];
		if ( items.length === 0 ) {
			return null;
		}
		let codeUnit = getSingleCodeUnit( items[ 0 ] );
		if ( codeUnit === null ) {
			return null;
		}
		codeUnits.push( codeUnit );
		const annotations = getAnnotations( items[ 0 ] );
		const annotationString = annotations.join( ',' );
		for ( let i = 1; i < items.length; i++ ) {
			codeUnit = getSingleCodeUnit( items[ i ] );
			if ( codeUnit === null ) {
				return null;
			}
			codeUnits.push( codeUnit );
			if ( annotationString !== getAnnotations( items[ i ] ).join( ',' ) ) {
				return null;
			}
		}
		return {
			text: codeUnits.join( '' ),
			annotations,
			annotationString
		};
	}

	const op0 = tx.operations[ 0 ];
	const op1 = tx.operations[ 1 ];
	const op2 = tx.operations[ 2 ];
	let replaceOp, start, end, docLength;
	if (
		op0 &&
		op0.type === 'replace' &&
		( !op1 || op1.type === 'retain' ) &&
		!op2
	) {
		replaceOp = op0;
		start = 0;
		end = start + replaceOp.insert.length;
		docLength = end;
	} else if (
		op0 &&
		op0.type === 'retain' &&
		op1 &&
		op1.type === 'replace' &&
		( !op2 || op2.type === 'retain' )
	) {
		replaceOp = op1;
		start = op0.length;
		end = start + replaceOp.insert.length;
		docLength = end + ( op2 ? op2.length : 0 );
	} else {
		return null;
	}

	return {
		start,
		end,
		docLength,
		authorId: tx.authorId,
		uniformInsert: getUniformText( replaceOp.insert )
	};
};

/* Methods */

/**
 * Create a clone of this Change
 *
 * @return {ve.dm.Change} Clone of this change
 */
ve.dm.Change.prototype.clone = function () {
	return this.constructor.static.unsafeDeserialize( this.toJSON() );
};

/**
 * @return {boolean} True if this change has no transactions or selections
 */
ve.dm.Change.prototype.isEmpty = function () {
	return this.transactions.length === 0 && Object.keys( this.selections ).length === 0;
};

/**
 * @return {number} The number of transactions
 */
ve.dm.Change.prototype.getLength = function () {
	return this.transactions.length;
};

/**
 * Get the store items introduced by transaction n
 *
 * @param {number} n The index of a transaction within the change
 * @return {ve.dm.HashValueStore} The store items introduced by transaction n
 */
ve.dm.Change.prototype.getStore = function ( n ) {
	return this.store.slice(
		n > 0 ? this.storeLengthAtTransaction[ n - 1 ] : 0,
		this.storeLengthAtTransaction[ n ]
	);
};

/**
 * Get the stores for each transaction
 *
 * @return {ve.dm.HashValueStore[]} Each transaction's store items (shallow copied store)
 */
ve.dm.Change.prototype.getStores = function () {
	const stores = [];
	let start = 0;
	for ( let i = 0, len = this.getLength(); i < len; i++ ) {
		const end = this.storeLengthAtTransaction[ i ];
		stores.push( this.store.slice( start, end ) );
		start = end;
	}
	return stores;
};

/**
 * @return {number|null} The first author in a transaction or selection change, or null if empty
 */
ve.dm.Change.prototype.firstAuthorId = function () {
	if ( this.transactions.length ) {
		return this.transactions[ 0 ].authorId;
	}
	const authors = Object.keys( this.selections );
	if ( authors.length ) {
		return +authors[ 0 ];
	}
	return null;
};

/**
 * Get a human-readable summary of the change
 *
 * @return {string} Human-readable summary
 */
ve.dm.Change.prototype.summarize = function () {
	return '{ start: ' + this.start + ', txs: [ ' +
		this.transactions.map( ( tx ) => tx.summarize() ).join( ', ' ) + ' ] }';
};

/**
 * Get the change that backs out this change.
 *
 * Note that applying it will not revert start or remove stored items
 *
 * @return {ve.dm.Change} The change that backs out this change
 */
ve.dm.Change.prototype.reversed = function () {
	return new ve.dm.Change(
		this.start + this.transactions.length,
		this.transactions.map( ( tx ) => ve.dm.Transaction.prototype.reversed.call( tx ) ).reverse(),
		// Empty store for each transaction (reverting cannot possibly add new annotations)
		this.transactions.map( () => new ve.dm.HashValueStore() ),
		{}
	);
};

/**
 * Rebase this change onto other (ready to apply on top of other)
 *
 * @param {ve.dm.Change} other Other change
 * @return {ve.dm.Change|null} Rebased change applicable on top of other, or null if rebasing fails
 * @throws {Error} If this change and other have different starts
 */
ve.dm.Change.prototype.rebasedOnto = function ( other ) {
	const rebases = this.constructor.static.rebaseUncommittedChange( other, this );
	return rebases.rejected ? null : rebases.rebased;
};

/**
 * Build a composite change from two consecutive changes
 *
 * @param {ve.dm.Change} other Change that starts immediately after this
 * @return {ve.dm.Change} Composite change
 * @throws {Error} If other does not start immediately after this
 */
ve.dm.Change.prototype.concat = function ( other ) {
	if ( other.start !== this.start + this.transactions.length ) {
		throw new Error( 'this ends at ' + ( this.start + this.transactions.length ) +
			' but other starts at ' + other.start );
	}
	return new ve.dm.Change(
		this.start,
		this.transactions.concat( other.transactions ),
		this.getStores().concat( other.getStores() ),
		other.selections
	);
};

/**
 * Push a transaction, after having grown the hash value store if required
 *
 * @param {ve.dm.Transaction} transaction The transaction
 * @param {number} storeLength The corresponding store length required
 */
ve.dm.Change.prototype.pushTransaction = function ( transaction, storeLength ) {
	if ( typeof storeLength !== 'number' ) {
		throw new Error( 'Expected numerical storeLength argument, not ' + storeLength );
	}
	this.transactions.push( transaction );
	this.storeLengthAtTransaction.push( storeLength );
};

/**
 * Push another change onto this change
 *
 * @param {ve.dm.Change} other Change that starts immediately after this
 * @throws {Error} If other does not start immediately after this
 */
ve.dm.Change.prototype.push = function ( other ) {
	if ( other.start !== this.start + this.getLength() ) {
		throw new Error( 'this ends at ' + ( this.start + this.getLength() ) +
			' but other starts at ' + other.start );
	}
	const stores = other.getStores();
	other.transactions.forEach( ( transaction, i ) => {
		const store = stores[ i ];
		this.store.merge( store );
		this.pushTransaction( transaction, this.store.getLength() );
	} );
	this.selections = OO.cloneObject( other.selections );
};

/**
 * Build a composite change from two parallel changes
 *
 * @param {ve.dm.Change} other Change parallel to this
 * @return {ve.dm.Change} Composite change
 * @throws {Error} If this change and other have different starts
 */
ve.dm.Change.prototype.concatRebased = function ( other ) {
	return this.concat( other.rebasedOnto( this ) );
};

/**
 * Build a change from the last (most recent) transactions
 *
 * @param {number} start Start offset
 * @return {ve.dm.Change} Subset of this change with only the most recent transactions
 */
ve.dm.Change.prototype.mostRecent = function ( start ) {
	if ( arguments.length > 1 ) {
		throw new Error( 'storeStart is no longer needed' );
	}
	return new ve.dm.Change(
		start,
		this.transactions.slice( start - this.start ),
		this.getStores().slice( start - this.start ),
		OO.cloneObject( this.selections )
	);
};

/**
 * Build a change from the first (least recent) transactions of this change.
 *
 * Always removes selections.
 *
 * @param {number} length Number of transactions
 * @return {ve.dm.Change} Subset of this change with only the least recent transactions
 */
ve.dm.Change.prototype.truncate = function ( length ) {
	if ( arguments.length > 1 ) {
		throw new Error( 'storeLength is no longer needed' );
	}
	return new ve.dm.Change(
		this.start,
		this.transactions.slice( 0, length ),
		this.getStores().slice( 0, length ),
		{}
	);
};

/**
 * Apply change to surface
 *
 * @param {ve.dm.Surface} surface Surface in change start state
 * @param {boolean} [applySelection=false] Apply a selection based on the modified range
 */
ve.dm.Change.prototype.applyTo = function ( surface, applySelection ) {
	const doc = surface.getDocument();
	if ( this.start !== doc.completeHistory.getLength() ) {
		throw new Error( 'Change starts at ' + this.start + ', but doc is at ' + doc.completeHistory.getLength() );
	}
	this.getStores().forEach( ( store ) => {
		doc.store.merge( store );
	} );
	// Isolate other users' changes from ours with a breakpoint
	surface.breakpoint();
	this.transactions.forEach( ( tx ) => {
		surface.change( tx );
		// Don't mark as applied: this.start already tracks this
		tx.applied = false;

		// TODO: This would be better fixed by T202730
		if ( applySelection ) {
			const range = tx.getModifiedRange( doc );
			// If the transaction only touched the internal list, there is no modified range within the main document
			if ( range ) {
				const offset = doc.getNearestCursorOffset( range.end, -1 );
				if ( offset !== -1 ) {
					surface.setLinearSelection( new ve.Range( offset ) );
				}
			}
		}
	} );
	surface.breakpoint();
};

/**
 * Unapply change to surface, including truncating history and store
 *
 * @param {ve.dm.Surface} surface Surface in change end state
 */
ve.dm.Change.prototype.unapplyTo = function ( surface ) {
	const doc = surface.getDocument(),
		historyLength = doc.completeHistory.getLength() - this.getLength();
	if ( this.start !== historyLength ) {
		throw new Error( 'Invalid start: change starts at ' + this.start + ', but doc would be at ' + historyLength );
	}
	this.transactions.slice().reverse().forEach( ( tx ) => {
		surface.change( tx.reversed() );
	} );
	doc.completeHistory.transactions.length = historyLength;
	doc.completeHistory.storeLengthAtTransaction.length = historyLength;
	doc.store.truncate( doc.completeHistory.storeLengthAtTransaction[ historyLength - 1 ] );
};

/**
 * Append change transactions to history
 *
 * @param {ve.dm.Document} documentModel
 * @throws {Error} If this change does not start at the top of the history
 */
ve.dm.Change.prototype.addToHistory = function ( documentModel ) {
	documentModel.completeHistory.push( this );
};

/**
 * Remove change transactions from history
 *
 * @param {ve.dm.Document} doc
 * @throws {Error} If this change does not end at the top of the history
 */
ve.dm.Change.prototype.removeFromHistory = function ( doc ) {
	if ( this.start + this.getLength() !== doc.completeHistory.getLength() ) {
		throw new Error( 'this ends at ' + ( this.start + this.getLength() ) +
			' but history ends at ' + doc.completeHistory.getLength() );
	}
	doc.completeHistory.transactions.length -= this.transactions.length;
	doc.completeHistory.storeLengthAtTransaction.length -= this.transactions.length;
	doc.store.truncate( doc.completeHistory.storeLengthAtTransaction[ doc.completeHistory.getLength() - 1 ] );
};

/**
 * Serialize the change to a JSONable object
 *
 * Store values can be serialized, or kept verbatim (which only makes sense if they are serialized
 * already, i.e. the Change object was created by #deserialize without deserializing store values).
 *
 * @param {boolean} [preserveStoreValues=false] If true, keep store values verbatim instead of serializing
 * @return {Object} JSONable object
 */
ve.dm.Change.prototype.serialize = function ( preserveStoreValues ) {
	const getTransactionInfo = this.constructor.static.getTransactionInfo,
		selections = {};

	// Recursively serialize, so this method is the inverse of deserialize
	// without having to use JSON.stringify (which is also recursive).
	for ( const authorId in this.selections ) {
		selections[ authorId ] = this.selections[ authorId ].toJSON();
	}
	const serializeStoreValues = preserveStoreValues ? ( x ) => x :
		this.constructor.static.serializeValue;
	const serializeStore = ( store ) => store.serialize( serializeStoreValues );
	let prevInfo;
	const transactions = this.transactions.map( ( tx, i, arr ) => {
		const info = getTransactionInfo( tx );
		let result;
		if (
			info &&
			prevInfo &&
			info.authorId === prevInfo.authorId &&
			info.start === prevInfo.end &&
			info.uniformInsert &&
			prevInfo.uniformInsert &&
			info.uniformInsert.annotationString === prevInfo.uniformInsert.annotationString
		) {
			result = info.uniformInsert.text;
		} else {
			const txSerialized = tx.toJSON();
			if ( i > 0 && tx.authorId === arr[ i - 1 ].authorId ) {
				delete txSerialized.authorId;
			}
			result = txSerialized;
		}
		prevInfo = info;
		return result;
	} );
	const stores = this.getStores().map( serializeStore );
	const data = {
		start: this.start,
		transactions
	};
	// Only set stores if at least one is non-null
	if ( stores.some( ( store ) => store !== null ) ) {
		data.stores = stores;
	}
	if ( Object.keys( selections ).length ) {
		data.selections = selections;
	}
	return data;
};

/**
 * Called automatically by JSON.stringify, see #serialize.
 *
 * @param {string} [key] Key in parent object
 * @return {Object} JSONable object
 */
ve.dm.Change.prototype.toJSON = function () {
	// Ensure no native arguments are passed through to #serialize.
	return this.serialize();
};

/**
 * Get a Change with all this Change's Transactions compacted into one (or zero)
 *
 * The Change has the same effect when applied as this Change does, but it may cause
 * rebase conflicts where this change does not.
 *
 * TODO: introduce a "histLength" feature so the new change can be considered as
 * having length > 1.
 *
 * @return {ve.dm.Change} One-Transaction version of this Change (or empty change)
 */
ve.dm.Change.prototype.squash = function () {
	if ( this.transactions.length <= 1 ) {
		return this.clone();
	}
	return new ve.dm.Change(
		this.start,
		[ ve.dm.TransactionSquasher.static.squash( this.transactions ) ],
		[ this.store.slice() ],
		// Shallow clone (the individual selections are immutable so need no cloning)
		OO.cloneObject( this.selections )
	);
};

/*!
 * VisualEditor DataModel rebase document state class.
 *
 * @copyright See AUTHORS.txt
 */

'use strict';

/**
 * DataModel rebase document state
 *
 * @class
 *
 * @constructor
 */
ve.dm.RebaseDocState = function VeDmRebaseDocState() {
	/**
	 * @property {ve.dm.Change} history History as one big change
	 */
	this.history = new ve.dm.Change();

	/**
	 * @property {Map.<number, Object>} authors Information about each author
	 */
	this.authors = new Map();
};

/* Inheritance */

OO.initClass( ve.dm.RebaseDocState );

/* Static Methods */

/**
 * @typedef {Object} AuthorData
 * @memberof ve.dm.RebaseDocState
 * @property {string} name
 * @property {string} color
 * @property {number} rejections Number of unacknowledged rejections
 * @property {ve.dm.Change|null} continueBase Continue base
 * @property {string} token Secret token for usurping sessions
 * @property {boolean} active Whether the author is active
 */

/**
 * Get new empty author data object
 *
 * @return {ve.dm.RebaseDocState.AuthorData} New empty author data object
 */
ve.dm.RebaseDocState.static.newAuthorData = function () {
	return {
		name: '',
		color: '',
		rejections: 0,
		continueBase: null,
		// TODO use cryptographic randomness here and convert to hex
		token: Math.random().toString(),
		active: true
	};
};

/* Methods */

ve.dm.RebaseDocState.prototype.getActiveAuthors = function () {
	const result = {};
	this.authors.forEach( ( authorData, authorId ) => {
		if ( authorData.active ) {
			result[ authorId ] = {
				name: authorData.name,
				color: authorData.color
			};
		}
	} );
	return result;
};

ve.dm.RebaseDocState.prototype.clearHistory = function () {
	this.history = new ve.dm.Change();
	this.authors.forEach( ( authorData ) => {
		authorData.continueBase = null;
	} );
};

/*!
 * VisualEditor DataModel rebase server class.
 *
 * @copyright See AUTHORS.txt
 */

'use strict';

/**
 * DataModel rebase server
 *
 * @class
 *
 * @constructor
 * @param {Function} [logCallback]
 */
ve.dm.RebaseServer = function VeDmRebaseServer( logCallback ) {
	this.stateForDoc = new Map();
	this.logEvent = logCallback || function () {};
};

OO.initClass( ve.dm.RebaseServer );

/* Methods */

/**
 * Get the state of a document by name.
 *
 * @param {string} doc Name of a document
 * @return {ve.dm.RebaseDocState} Document state
 */
ve.dm.RebaseServer.prototype.getDocState = function ( doc ) {
	if ( !this.stateForDoc.has( doc ) ) {
		this.stateForDoc.set( doc, new ve.dm.RebaseDocState() );
	}
	return this.stateForDoc.get( doc );
};

/**
 * Update document history
 *
 * @param {string} doc Name of a document
 * @param {number|null} authorId Author ID
 * @param {ve.dm.Change} [newHistory] New history to append
 * @param {Object} [authorDataChanges] New values for author data (modified keys only)
 */
ve.dm.RebaseServer.prototype.updateDocState = function updateDocState( doc, authorId, newHistory, authorDataChanges ) {
	const state = this.getDocState( doc );
	if ( newHistory ) {
		state.history.push( newHistory );
	}
	if ( !authorId ) {
		return;
	}
	let authorData = state.authors.get( authorId );
	if ( !authorData ) {
		authorData = state.constructor.static.newAuthorData();
		state.authors.set( authorId, authorData );
	}
	if ( authorDataChanges ) {
		for ( const key in authorData ) {
			if ( authorDataChanges[ key ] !== undefined ) {
				authorData[ key ] = authorDataChanges[ key ];
			}
		}
	}
};

/**
 * Forget all history for a document
 *
 * @param {string} doc Name of a document
 */
ve.dm.RebaseServer.prototype.clearDocState = function clearDocState( doc ) {
	const state = this.stateForDoc.get( doc );
	if ( !state ) {
		return;
	}
	state.clearHistory();
};

/**
 * Attempt to rebase and apply a change to a document.
 *
 * The change can be a new change, or a continued change. A continuated change means one that
 * follows on immediately from the author's last submitted change, other than possibly being
 * rebased onto some more recent committed history.
 *
 * @param {string} doc Document name
 * @param {number} authorId Author ID
 * @param {number} backtrack How many transactions are backtracked from the previous submission
 * @param {ve.dm.Change} change Change to apply
 * @return {ve.dm.Change} Accepted change (or initial segment thereof), as rebased
 */
ve.dm.RebaseServer.prototype.applyChange = function applyChange( doc, authorId, backtrack, change ) {
	const state = this.getDocState( doc ),
		authorData = state.authors.get( authorId );

	let appliedChange;

	let base = ( authorData && authorData.continueBase ) || change.truncate( 0 );
	let rejections = ( authorData && authorData.rejections ) || 0;
	if ( rejections > backtrack ) {
		// Follow-on does not fully acknowledge outstanding conflicts: reject entirely
		rejections = rejections - backtrack + change.transactions.length;
		this.updateDocState( doc, authorId, null, { rejections } );
		// FIXME argh this publishes an empty change, which is not what we want
		appliedChange = state.history.truncate( 0 );
	} else if ( rejections < backtrack ) {
		throw new Error( 'Backtrack=' + backtrack + ' > ' + rejections + '=rejections' );
	} else {
		if ( change.start > base.start ) {
			// Remote has rebased some committed changes into its history since base was built.
			// They are guaranteed to be equivalent to the start of base. See mathematical
			// docs for proof (Cuius rei demonstrationem mirabilem sane deteximus hanc marginis
			// exiguitas non caperet).
			base = base.mostRecent( change.start );
		}
		base = base.concat( state.history.mostRecent( base.start + base.getLength() ) );

		const result = ve.dm.Change.static.rebaseUncommittedChange( base, change );
		rejections = result.rejected ? result.rejected.getLength() : 0;
		this.updateDocState( doc, authorId, result.rebased, {
			rejections,
			continueBase: result.transposedHistory
		} );
		appliedChange = result.rebased;
	}
	this.logEvent( {
		type: 'applyChange',
		doc,
		authorId,
		incoming: change,
		applied: appliedChange,
		backtrack,
		rejections
	} );
	return appliedChange;
};

/*!
 * VisualEditor document store class.
 *
 * @copyright See AUTHORS.txt
 */

'use strict';

/**
 * @constructor
 * @param {Object} storageClient MongoClient-like object; passed as a parameter for testing purposes
 * @param {string} dbName Database name
 * @param {Object} logger Logger class
 * @param {Function} logger.logServerEvent Stringify object argument to log, adding timestamp and server ID properties
 */
ve.dm.DocumentStore = function VeDmDocumentStore( storageClient, dbName, logger ) {
	this.storageClient = storageClient;
	this.dbName = dbName;
	this.logger = logger;
	this.db = null;
	this.collection = null;
	this.startForDoc = new Map();
	this.serverId = null;
};

/**
 * @return {Promise} Resolves when connected
 */
ve.dm.DocumentStore.prototype.connect = function () {
	const documentStore = this;
	return this.storageClient.connect().then( ( client ) => {
		const db = client.db( documentStore.dbName );
		documentStore.logger.logServerEvent( { type: 'DocumentStore#connected', dbName: documentStore.dbName }, 'info' );
		documentStore.db = db;
		documentStore.collection = db.collection( 'vedocstore' );
		return documentStore.collection.findOneAndUpdate(
			{ config: 'options' },
			{ $setOnInsert: { serverId: Math.random().toString( 36 ).slice( 2 ) } },
			{ upsert: true, returnDocument: 'after' }
		);
	} ).then( ( result ) => {
		documentStore.serverId = result.value.serverId;
	} );
};

/**
 * @return {Promise} Drops the entire database
 */
ve.dm.DocumentStore.prototype.dropDatabase = function () {
	this.logger.logServerEvent( { type: 'DocumentStore#dropDatabase', dbName: this.dbName }, 'info' );
	return this.db.dropDatabase();
};

/**
 * Load a document from storage (creating as empty if absent)
 *
 * @param {string} docName Name of the document
 * @return {Promise} Confirmed document history as a ve.dm.Change
 */
ve.dm.DocumentStore.prototype.load = function ( docName ) {
	const documentStore = this;
	return this.collection.findOneAndUpdate(
		{ docName },
		{ $setOnInsert: { start: 0, transactions: [], stores: [] } },
		{ upsert: true, returnDocument: 'after' }
	).then( ( result ) => {
		const length = result.value.transactions.length || 0;
		documentStore.logger.logServerEvent( { type: 'DocumentStore#loaded', docName, length } );
		documentStore.startForDoc.set( docName, result.value.start + length );
		return ve.dm.Change.static.deserialize( {
			start: 0,
			transactions: result.value.transactions,
			stores: result.value.stores,
			selections: {}
		}, true );
	} );
};

/**
 * Save a new change to storage
 *
 * @param {string} docName Name of the document
 * @param {ve.dm.Change} change The new change
 * @return {Promise} Resolves when saved
 */
ve.dm.DocumentStore.prototype.onNewChange = function ( docName, change ) {
	const serializedChange = change.serialize( true ),
		expectedStart = this.startForDoc.get( docName ) || 0;

	if ( expectedStart !== serializedChange.start ) {
		return Promise.reject( 'Unmatched starts:', expectedStart, serializedChange.start );
	}
	this.startForDoc.set( docName, serializedChange.start + serializedChange.transactions.length );
	return this.collection.updateOne(
		{ docName },
		{
			$push: {
				transactions: { $each: serializedChange.transactions },
				stores: { $each: serializedChange.stores || serializedChange.transactions.map( () => null ) }
			}
		}
	).then( () => {
		this.logger.logServerEvent( {
			type: 'DocumentStore#onNewChange',
			docName,
			start: serializedChange.start,
			length: serializedChange.transactions.length
		} );
	} );
};

ve.dm.DocumentStore.prototype.onClose = function () {
	this.logger.logServerEvent( { type: 'DocumentStore#onClose' }, 'info' );
	this.storageClient.close();
};

/*!
 * VisualEditor DataModel protocol server class.
 *
 * @copyright See AUTHORS.txt
 */

'use strict';

/**
 * Protocol server
 *
 * Handles the abstract protocol without knowing the specific transport
 *
 * @param {ve.dm.DocumentStore} documentStore The persistent storage
 * @param {Object} logger Logger class
 * @param {Function} logger.getRelativeTimestmap Return the number of ms since the logger started
 * @param {Function} logger.logEvent Stringify object argument to log
 * @param {Function} logger.logServerEvent Stringify object argument to log, adding timestamp and server ID properties
 */
ve.dm.ProtocolServer = function VeDmProtocolServer( documentStore, logger ) {
	this.logger = logger;
	this.rebaseServer = new ve.dm.RebaseServer();
	this.lastAuthorForDoc = new Map();
	this.loadingForDoc = new Map();
	this.documentStore = documentStore;
	this.logger.logServerEvent( { type: 'restart' }, 'info' );
};

OO.initClass( ve.dm.ProtocolServer );

ve.dm.ProtocolServer.static.palette = [
	'1f77b4', 'ff7f0e', '2ca02c', 'd62728', '9467bd',
	'8c564b', 'e377c2', '7f7f7f', 'bcbd22', '17becf',
	'aec7e8', 'ffbb78', '98df8a', 'ff9896', 'c5b0d5',
	'c49c94', 'f7b6d2', 'c7c7c7', 'dbdb8d', '9edae5'
];

/**
 * If the document is not loaded, load from storage (creating as empty if absent)
 *
 * @param {string} docName Name of the document
 * @return {Promise} Resolves when loaded
 */
ve.dm.ProtocolServer.prototype.ensureLoaded = function ( docName ) {
	const rebaseServer = this.rebaseServer;

	let loading = this.loadingForDoc.get( docName );

	if ( loading ) {
		return loading;
	}
	this.logger.logServerEvent( { type: 'ProtocolServer#load', docName } );
	loading = this.documentStore.load( docName ).then( ( change ) => {
		this.logger.logServerEvent( {
			type: 'ProtocolServer#loaded',
			docName,
			length: change.getLength()
		} );
		rebaseServer.updateDocState( docName, null, change );
	} );
	this.loadingForDoc.set( docName, loading );
	return loading;
};

/**
 * Check the client's credentials, and return a connection context object
 *
 * If the client is not recognised and authenticated, a new client ID and token are assigned.
 *
 * @param {string} docName The document name
 * @param {number|null} authorId The author ID, if any
 * @param {number|null} token The secret token, if any
 *
 * @return {Object} The connection context
 */
ve.dm.ProtocolServer.prototype.authenticate = function ( docName, authorId, token ) {
	const state = this.rebaseServer.stateForDoc.get( docName ),
		authorData = state && state.authors.get( authorId );

	if ( !authorData || token !== authorData.token ) {
		authorId = 1 + ( this.lastAuthorForDoc.get( docName ) || 0 );
		this.lastAuthorForDoc.set( docName, authorId );
		token = Math.random().toString( 36 ).slice( 2 );
	}
	const context = {
		serverId: this.documentStore.serverId,
		docName,
		authorId
	};
	this.logger.logServerEvent( {
		type: 'newClient',
		doc: docName,
		authorId: context.authorId
	} );
	return context;
};

/**
 * Add an event to the log
 *
 * @param {Object} context The connection context
 * @param {Object} event Event data
 */
ve.dm.ProtocolServer.prototype.onLogEvent = function ( context, event ) {
	const ob = {};
	ob.recvTimestamp = this.logger.getRelativeTimestamp();
	ob.clientId = context.authorId;
	ob.doc = context.docName;
	for ( const key in event ) {
		ob[ key ] = event[ key ];
	}
	this.logger.logEvent( ob );
};

/**
 * Setup author on the server and send initialization events
 *
 * @param {Object} context The connection context
 * @param {number} [startLength=0] The length of the common history
 * @param {Function} [usernameGenerator] Function which returns a username, with an authorID argument
 */
ve.dm.ProtocolServer.prototype.welcomeClient = function ( context, startLength = 0, usernameGenerator = undefined ) {
	const docName = context.docName,
		serverId = context.serverId,
		authorId = context.authorId;

	this.rebaseServer.updateDocState( docName, authorId, null, {
		name: usernameGenerator ? usernameGenerator( authorId ) : 'User ' + authorId,
		color: this.constructor.static.palette[
			authorId % this.constructor.static.palette.length
		],
		active: true
	} );

	const state = this.rebaseServer.getDocState( docName );
	const authorData = state.authors.get( authorId );

	context.sendAuthor( 'registered', {
		serverId,
		authorId,
		token: authorData.token
	} );
	context.broadcast( 'authorChange', {
		authorId,
		authorData: {
			name: authorData.name,
			color: authorData.color
		}
	} );
	// HACK Catch the client up on the current state by sending it the entire history
	// Ideally we'd be able to initialize the client using HTML, but that's hard, see
	// comments in the /raw handler. Keeping an updated linmod on the server could be
	// feasible if TransactionProcessor was modified to have a "don't sync, just apply"
	// mode and ve.dm.Document was faked with { data: …, metadata: …, store: … }
	context.sendAuthor( 'initDoc', {
		history: state.history.mostRecent( startLength ).serialize( true ),
		authors: state.getActiveAuthors()
	} );
};

/**
 * Try to apply a received change, and broadcast the successful portion as rebased
 *
 * @param {Object} context The connection context
 * @param {Object} data The change data
 */
ve.dm.ProtocolServer.prototype.onSubmitChange = function ( context, data ) {
	const change = ve.dm.Change.static.deserialize( data.change, true );
	const applied = this.rebaseServer.applyChange( context.docName, context.authorId, data.backtrack, change );
	if ( !applied.isEmpty() ) {
		this.documentStore.onNewChange( context.docName, applied );
		context.broadcast( 'newChange', applied.serialize( true ) );
	}
};

/**
 * Apply and broadcast an author change
 *
 * @param {Object} context The connection context
 * @param {Object} newData The new author data
 */
ve.dm.ProtocolServer.prototype.onChangeAuthor = function ( context, newData ) {
	this.rebaseServer.updateDocState( context.docName, context.authorId, null, newData );
	context.broadcast( 'authorChange', {
		authorId: context.authorId,
		authorData: newData
	} );
	this.logger.logServerEvent( {
		type: 'authorChange',
		doc: context.docName,
		authorId: context.authorId,
		authorData: newData
	} );
};

/**
 * Apply and broadcast a disconnection (which may be temporary)
 *
 * @param {Object} context The connection context
 */
ve.dm.ProtocolServer.prototype.onDisconnect = function ( context ) {
	this.rebaseServer.updateDocState( context.docName, context.authorId, null, {
		active: false,
		continueBase: null,
		rejections: null
	} );
	context.broadcast( 'authorDisconnect', context.authorId );
	this.logger.logServerEvent( {
		type: 'disconnect',
		doc: context.docName,
		authorId: context.authorId
	} );
};

/*!
 * VisualEditor DataModel transport server class.
 *
 * @copyright See AUTHORS.txt
 */

'use strict';

/**
 * Transport server for Socket IO transport
 *
 * @constructor
 * @param {ve.dm.ProtocolServer} protocolServer The protocol server
 */
ve.dm.TransportServer = function VeDmTransportServer( protocolServer ) {
	this.protocolServer = protocolServer;
};

OO.initClass( ve.dm.TransportServer );

/**
 * Generic connection handler
 *
 * This just creates a namespace handler for the docName, if one does not already exist
 *
 * @param {Function} getRoom One-argument function taking docName, returning the corresponding room
 * @param {Object} socket The io socket
 * @return {Promise}
 */
ve.dm.TransportServer.prototype.onConnection = function ( getRoom, socket ) {
	const server = this.protocolServer,
		docName = socket.handshake.query.docName,
		authorId = +socket.handshake.query.authorId || null,
		token = socket.handshake.query.token || null;

	/**
	 * Ensure the doc is loaded when calling f
	 *
	 * @param {Function} f A method of server
	 * @param {Object} context Connection context object passed to f as first argument
	 * @return {Function} Function returning a promise resolving with f's return value
	 */
	function ensureLoadedWrap( f, context ) {
		// In theory, some protection is needed to ensure the document cannot unload
		// between the ensureLoaded promise resolving and f running. In practice,
		// this should not happen if the unloading is not too aggressive.
		return function () {
			const args = Array.prototype.slice.call( arguments );
			args.splice( 0, 0, context );
			return server.ensureLoaded( docName ).then( () => f.apply( server, args ) );
		};
	}

	socket.join( docName );
	return server.ensureLoaded( docName ).then( () => {
		const context = server.authenticate( docName, authorId, token );
		context.broadcast = function () {
			const room = getRoom( docName );
			room.emit.apply( room, arguments );
		};
		context.sendAuthor = socket.emit.bind( socket );
		context.connectionId = socket.client.conn.remoteAddress + ' ' + socket.handshake.url;
		socket.on( 'submitChange', ensureLoadedWrap( server.onSubmitChange, context ) );
		socket.on( 'changeAuthor', ensureLoadedWrap( server.onChangeAuthor, context ) );
		socket.on( 'disconnect', ensureLoadedWrap( server.onDisconnect, context ) );
		socket.on( 'logEvent', ensureLoadedWrap( server.onLogEvent, context ) );
		server.welcomeClient( context );
	} );
};

/*!
 * VisualEditor Range class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * @class
 *
 * @constructor
 * @param {number} [from=0] Anchor offset
 * @param {number} [to=from] Focus offset
 */
ve.Range = function VeRange( from, to ) {
	// For ease of debugging, check arguments.length when applying defaults, to preserve
	// invalid arguments such as undefined and NaN that indicate a programming error.
	// Range calculation errors can often propagate quite far before surfacing, so the
	// indication is important.
	this.from = arguments.length >= 1 ? from : 0;
	this.to = arguments.length >= 2 ? to : this.from;
	this.start = this.from < this.to ? this.from : this.to;
	this.end = this.from < this.to ? this.to : this.from;
};

/* Inheritance */

OO.initClass( ve.Range );

/**
 * @property {number} from Starting offset
 */

/**
 * @property {number} to Ending offset
 */

/**
 * @property {number} start Starting offset (the lesser of #to and #from)
 */

/**
 * @property {number} end Ending offset (the greater of #to and #from)
 */

/* Static Methods */

/**
 * Create a new range from a JSON serialization of a range
 *
 * @see ve.Range#toJSON
 *
 * @param {string} json JSON serialization
 * @return {ve.Range} New range
 */
ve.Range.static.newFromJSON = function ( json ) {
	return this.newFromHash( JSON.parse( json ) );
};

/**
 * Create a new range from a range hash object
 *
 * @see ve.Range#toJSON
 *
 * @param {Object} hash
 * @return {ve.Range} New range
 */
ve.Range.static.newFromHash = function ( hash ) {
	return new ve.Range( hash.from, hash.to );
};

/**
 * Create a range object that covers all of the given ranges.
 *
 * @static
 * @param {ve.Range[]} ranges Array of ve.Range objects (at least one)
 * @param {boolean} backwards Return a backwards range
 * @return {ve.Range} Range that spans all of the given ranges
 */
ve.Range.static.newCoveringRange = function ( ranges, backwards ) {
	if ( ranges.length === 0 ) {
		throw new Error( 'newCoveringRange() requires at least one range' );
	}
	let minStart = ranges[ 0 ].start;
	let maxEnd = ranges[ 0 ].end;
	ranges.forEach( ( range, i ) => {
		if ( i === 0 ) {
			return;
		}
		if ( range.start < minStart ) {
			minStart = range.start;
		}
		if ( range.end > maxEnd ) {
			maxEnd = range.end;
		}
	} );
	return backwards ? new ve.Range( maxEnd, minStart ) : new ve.Range( minStart, maxEnd );
};

/* Methods */

/**
 * Check if an offset is within the range.
 *
 * Specifically we mean the whole element at a specific offset, so in effect
 * this is the same as #containsRange( new ve.Range( offset, offset + 1 ) ).
 *
 * @param {number} offset Offset to check
 * @return {boolean} If offset is within the range
 */
ve.Range.prototype.containsOffset = function ( offset ) {
	return offset >= this.start && offset < this.end;
};

/**
 * Check if another range is within the range.
 *
 * @param {ve.Range} range Range to check
 * @return {boolean} If other range is within the range
 */
ve.Range.prototype.containsRange = function ( range ) {
	return range.start >= this.start && range.end <= this.end;
};

/**
 * Check if another range is touching this one
 *
 * This includes ranges which touch this one, e.g. [1,3] & [3,5],
 * ranges which overlap this one, and ranges which cover
 * this one completely, e.g. [1,3] & [0,5].
 *
 * Useful for testing if two ranges can be joined (using #expand)
 *
 * @param {ve.Range} range Range to check
 * @return {boolean} If other range touches this range
 */
ve.Range.prototype.touchesRange = function ( range ) {
	return range.end >= this.start && range.start <= this.end;
};

/**
 * Check if another range overlaps this one
 *
 * This includes ranges which intersect this one, e.g. [1,3] & [2,4],
 * and ranges which cover this one completely, e.g. [1,3] & [0,5],
 * but *not* ranges which only touch, e.g. [0,2] & [2,4].
 *
 * @param {ve.Range} range Range to check
 * @return {boolean} If other range overlaps this range
 */
ve.Range.prototype.overlapsRange = function ( range ) {
	return range.end > this.start && range.start < this.end;
};

/**
 * Get the length of the range.
 *
 * @return {number} Length of range
 */
ve.Range.prototype.getLength = function () {
	return this.end - this.start;
};

/**
 * Gets a range with reversed direction.
 *
 * @return {ve.Range} A new range
 */
ve.Range.prototype.flip = function () {
	return new ve.Range( this.to, this.from );
};

/**
 * Get a range that's a translated version of this one.
 *
 * @param {number} distance Distance to move range by
 * @return {ve.Range} New translated range
 */
ve.Range.prototype.translate = function ( distance ) {
	return new ve.Range( this.from + distance, this.to + distance );
};

/**
 * Check if two ranges are equal, taking direction into account.
 *
 * @param {ve.Range|null} other
 * @return {boolean}
 */
ve.Range.prototype.equals = function ( other ) {
	return other && this.from === other.from && this.to === other.to;
};

/**
 * Check if two ranges are equal, ignoring direction.
 *
 * @param {ve.Range|null} other
 * @return {boolean}
 */
ve.Range.prototype.equalsSelection = function ( other ) {
	return other && this.end === other.end && this.start === other.start;
};

/**
 * Create a new range with a truncated length.
 *
 * @param {number} limit Maximum length of new range (negative for left-side truncation)
 * @return {ve.Range} A new range
 */
ve.Range.prototype.truncate = function ( limit ) {
	if ( limit >= 0 ) {
		return new ve.Range(
			this.start, Math.min( this.start + limit, this.end )
		);
	} else {
		return new ve.Range(
			Math.max( this.end + limit, this.start ), this.end
		);
	}
};

/**
 * Expand a range to include another range, preserving direction.
 *
 * @param {ve.Range} other Range to expand to include
 * @return {ve.Range} Range covering this range and other
 */
ve.Range.prototype.expand = function ( other ) {
	return ve.Range.static.newCoveringRange( [ this, other ], this.isBackwards() );
};

/**
 * Check if the range is collapsed.
 *
 * A collapsed range has equal start and end values making its length zero.
 *
 * @return {boolean} Range is collapsed
 */
ve.Range.prototype.isCollapsed = function () {
	return this.from === this.to;
};

/**
 * Check if the range is backwards, i.e. from > to
 *
 * @return {boolean} Range is backwards
 */
ve.Range.prototype.isBackwards = function () {
	return this.from > this.to;
};

/**
 * Get a object summarizing the range for JSON serialization
 *
 * @param {string} [key] Key in parent object
 * @return {Object} Object for JSON serialization
 */
ve.Range.prototype.toJSON = function () {
	return {
		type: 'range',
		from: this.from,
		to: this.to
	};
};

/**
 * Iterate over the range, calling a function for each index, to build an array.
 *
 * @param {function(number): any} callback Function called for each index
 * @return {Array} Array of results
 */
ve.Range.prototype.map = function ( callback ) {
	const result = [];
	for ( let i = this.start; i < this.end; i++ ) {
		result.push( callback( i ) );
	}
	return result;
};

/**
 * Iterate over the range, calling a function for each index
 *
 * @param {function(number): void} callback Function called for each index
 */
ve.Range.prototype.forEach = function ( callback ) {
	for ( let i = this.start; i < this.end; i++ ) {
		callback( i );
	}
};

/**
 * Test whether at least one index in the range passes the test implemented by the provided function.
 *
 * @param {function(number): boolean} callback Function called for each index
 * @return {boolean} True if the callback returns true for any index
 */
ve.Range.prototype.some = function ( callback ) {
	for ( let i = this.start; i < this.end; i++ ) {
		if ( callback( i ) ) {
			return true;
		}
	}
	return false;
};

/**
 * Test whether all indices in the range pass the test implemented by the provided function.
 *
 * @param {function(number): boolean} callback Function called for each index
 * @return {boolean} True if the callback returns true for all indices
 */
ve.Range.prototype.every = function ( callback ) {
	for ( let i = this.start; i < this.end; i++ ) {
		if ( !callback( i ) ) {
			return false;
		}
	}
	return true;
};

/**
 * Trim elements from both ends of the range using a callback.
 *
 * Walks from start forwards and end backwards, removing elements for which callback returns true.
 * Stops trimming at each end when callback returns false. Returns a new trimmed range.
 *
 * @param {function(number): boolean} callback Called with index
 * @return {ve.Range} New trimmed range
 */
ve.Range.prototype.trimCallback = function ( callback ) {
	let newStart = this.start;
	let newEnd = this.end;

	while ( newEnd > newStart && callback( newEnd - 1 ) ) {
		newEnd--;
	}

	while ( newStart < newEnd && callback( newStart ) ) {
		newStart++;
	}

	return this.isBackwards() ? new ve.Range( newEnd, newStart ) : new ve.Range( newStart, newEnd );
};

/**
 * Expand the range outwards from both ends while callback returns true.
 * Walks from start-1 backwards and end forwards, expanding as long as callback returns true.
 * Stops expanding at each end when callback returns false. Returns a new expanded range.
 *
 * @param {function(number, number): boolean} callback Called with (index, iFromStartOrEnd)
 * @param {ve.Range} maxRange Maximum range to expand to
 * @return {ve.Range} New expanded range
 */
ve.Range.prototype.expandCallback = function ( callback, maxRange ) {
	let newStart = this.start;
	let newEnd = this.end;

	while ( newEnd < maxRange.end && callback( newEnd ) ) {
		newEnd++;
	}

	while ( newStart > maxRange.start && callback( newStart - 1 ) ) {
		newStart--;
	}

	return this.isBackwards() ? new ve.Range( newEnd, newStart ) : new ve.Range( newStart, newEnd );
};

/*!
 * VisualEditor Selection class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * @class
 * @abstract
 * @constructor
 */
ve.dm.Selection = function VeDmSelection() {
};

/* Inheritance */

OO.initClass( ve.dm.Selection );

/* Static Properties */

ve.dm.Selection.static.type = null;

/* Static Methods */

/**
 * Create a new selection from a JSON serialization
 *
 * @param {string|Object} json JSON serialization or hash object
 * @return {ve.dm.Selection} New selection
 * @throws {Error} Unknown selection type
 */
ve.dm.Selection.static.newFromJSON = function ( json ) {
	if ( ve.dm.Document && arguments[ 0 ] instanceof ve.dm.Document ) {
		throw new Error( 'Got obsolete ve.dm.Document argument' );
	}
	const hash = typeof json === 'string' ? JSON.parse( json ) : json;
	const constructor = ve.dm.selectionFactory.lookup( hash.type );

	if ( !constructor ) {
		throw new Error( 'Unknown selection type ' + hash.name );
	}

	return constructor.static.newFromHash( hash );
};

/**
 * Create a new selection from a hash object
 *
 * @abstract
 * @param {Object} hash
 * @return {ve.dm.Selection} New selection
 */
ve.dm.Selection.static.newFromHash = null;

/* Methods */

/**
 * Get a JSON serialization of this selection
 *
 * @abstract
 * @param {string} [key] Key in parent object
 * @return {Object} Object for JSON serialization
 */
ve.dm.Selection.prototype.toJSON = null;

/**
 * Get a textual description of this selection, for debugging purposes
 *
 * @abstract
 * @return {string} Textual description
 */
ve.dm.Selection.prototype.getDescription = null;

/**
 * Get a new selection at the start point of this one
 *
 * @abstract
 * @return {ve.dm.Selection} Collapsed selection
 */
ve.dm.Selection.prototype.collapseToStart = null;

/**
 * Get a new selection at the end point of this one
 *
 * @abstract
 * @return {ve.dm.Selection} Collapsed selection
 */
ve.dm.Selection.prototype.collapseToEnd = null;

/**
 * Get a new selection at the 'from' point of this one
 *
 * @abstract
 * @return {ve.dm.Selection} Collapsed selection
 */
ve.dm.Selection.prototype.collapseToFrom = null;

/**
 * Get a new selection at the 'to' point of this one
 *
 * @abstract
 * @return {ve.dm.Selection} Collapsed selection
 */
ve.dm.Selection.prototype.collapseToTo = null;

/**
 * Check if a selection is collapsed
 *
 * @abstract
 * @return {boolean} Selection is collapsed
 */
ve.dm.Selection.prototype.isCollapsed = null;

/**
 * Apply translations from a transaction
 *
 * @abstract
 * @param {ve.dm.Transaction} tx
 * @param {boolean} [excludeInsertion] Do not grow to cover insertions at boundaries
 * @return {ve.dm.Selection} A new translated selection
 */
ve.dm.Selection.prototype.translateByTransaction = null;

/**
 * Apply translations from a transaction, with bias depending on author ID comparison
 *
 * @abstract
 * @param {ve.dm.Transaction} tx
 * @param {number} authorId The selection's author ID
 * @return {ve.dm.Selection} A new translated selection
 */
ve.dm.Selection.prototype.translateByTransactionWithAuthor = null;

/**
 * Apply translations from a set of transactions
 *
 * @param {ve.dm.Transaction[]} txs Transactions
 * @param {boolean} [excludeInsertion] Do not grow to cover insertions at boundaries
 * @return {ve.dm.Selection} A new translated selection
 */
ve.dm.Selection.prototype.translateByTransactions = function ( txs, excludeInsertion ) {
	let selection = this;
	txs.forEach( ( tx ) => {
		selection = selection.translateByTransaction( tx, excludeInsertion );
	} );
	return selection;
};

/**
 * Apply translations from a change
 *
 * @param {ve.dm.Change} change
 * @param {number} authorId The author ID of this selection
 * @return {ve.dm.Selection} A new translated selection
 */
ve.dm.Selection.prototype.translateByChange = function ( change, authorId ) {
	let selection = this;
	change.transactions.forEach( ( tx ) => {
		selection = selection.translateByTransactionWithAuthor(
			tx,
			authorId
		);
	} );
	return selection;
};

/**
 * Check if this selection is null
 *
 * @return {boolean} The selection is null
 */
ve.dm.Selection.prototype.isNull = function () {
	return false;
};

/**
 * Get the content ranges for this selection
 *
 * @abstract
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {ve.Range[]} Ranges
 */
ve.dm.Selection.prototype.getRanges = null;

/**
 * Get the covering linear range for this selection
 *
 * @abstract
 * @return {ve.Range|null} Covering range, if not null
 */
ve.dm.Selection.prototype.getCoveringRange = null;

/**
 * Get the name of the selection type
 *
 * @return {string} Selection type name
 */
ve.dm.Selection.prototype.getName = function () {
	return this.constructor.static.name;
};

/**
 * Check if two selections are equal
 *
 * @abstract
 * @param {ve.dm.Selection} other
 * @return {boolean} Selections are equal
 */
ve.dm.Selection.prototype.equals = null;

/* Factory */

ve.dm.selectionFactory = new OO.Factory();

/*!
 * VisualEditor Null Selection class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * @class
 * @extends ve.dm.Selection
 * @constructor
 */
ve.dm.NullSelection = function VeDmNullSelection() {
	// Parent constructor
	ve.dm.NullSelection.super.call( this );
};

/* Inheritance */

OO.inheritClass( ve.dm.NullSelection, ve.dm.Selection );

/* Static Properties */

ve.dm.NullSelection.static.name = 'null';

/* Static Methods */

/**
 * @inheritdoc
 */
ve.dm.NullSelection.static.newFromHash = function () {
	return new ve.dm.NullSelection();
};

/* Methods */

/**
 * @inheritdoc
 */
ve.dm.NullSelection.prototype.toJSON = function () {
	return {
		type: this.constructor.static.name
	};
};

/**
 * @inheritdoc
 */
ve.dm.NullSelection.prototype.getDescription = function () {
	return 'Null';
};

/**
 * Used as a shortcut for methods which make no modification
 *
 * @private
 * @return {ve.dm.NullSelection} The selection itself
 */
ve.dm.NullSelection.prototype.self = function () {
	return this;
};

ve.dm.NullSelection.prototype.collapseToStart = ve.dm.NullSelection.prototype.self;

ve.dm.NullSelection.prototype.collapseToEnd = ve.dm.NullSelection.prototype.self;

ve.dm.NullSelection.prototype.collapseToFrom = ve.dm.NullSelection.prototype.self;

ve.dm.NullSelection.prototype.collapseToTo = ve.dm.NullSelection.prototype.self;

/**
 * @inheritdoc
 */
ve.dm.NullSelection.prototype.isCollapsed = function () {
	return true;
};

ve.dm.NullSelection.prototype.translateByTransaction = ve.dm.NullSelection.prototype.self;

ve.dm.NullSelection.prototype.translateByTransactionWithAuthor = ve.dm.NullSelection.prototype.self;

/**
 * @inheritdoc
 */
ve.dm.NullSelection.prototype.getRanges = function () {
	return [];
};

/**
 * @inheritdoc
 */
ve.dm.NullSelection.prototype.getCoveringRange = function () {
	return null;
};

/**
 * @inheritdoc
 */
ve.dm.NullSelection.prototype.equals = function ( other ) {
	return this === other || (
		!!other &&
		other.constructor === this.constructor
	);
};

/**
 * @inheritdoc
 */
ve.dm.NullSelection.prototype.isNull = function () {
	return true;
};

/* Registration */

ve.dm.selectionFactory.register( ve.dm.NullSelection );

/*!
 * VisualEditor Linear Selection class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * @class
 * @extends ve.dm.Selection
 * @constructor
 * @param {ve.Range} range
 */
ve.dm.LinearSelection = function VeDmLinearSelection( range ) {
	// Parent constructor
	ve.dm.LinearSelection.super.call( this );

	this.range = range;
};

/* Inheritance */

OO.inheritClass( ve.dm.LinearSelection, ve.dm.Selection );

/* Static Properties */

ve.dm.LinearSelection.static.name = 'linear';

/* Static Methods */

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.static.newFromHash = function ( hash ) {
	return new ve.dm.LinearSelection( ve.Range.static.newFromHash( hash.range ) );
};

/* Methods */

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.toJSON = function () {
	return {
		type: this.constructor.static.name,
		range: this.range
	};
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.getDescription = function () {
	return 'Linear: ' + this.range.from + ' - ' + this.range.to;
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.collapseToStart = function () {
	return new this.constructor( new ve.Range( this.getRange().start ) );
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.collapseToEnd = function () {
	return new this.constructor( new ve.Range( this.getRange().end ) );
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.collapseToFrom = function () {
	return new this.constructor( new ve.Range( this.getRange().from ) );
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.collapseToTo = function () {
	return new this.constructor( new ve.Range( this.getRange().to ) );
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.isCollapsed = function () {
	return this.getRange().isCollapsed();
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.translateByTransaction = function ( tx, excludeInsertion ) {
	return new this.constructor( tx.translateRange( this.getRange(), excludeInsertion ) );
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.translateByTransactionWithAuthor = function ( tx, authorId ) {
	return new this.constructor( tx.translateRangeWithAuthor( this.getRange(), authorId ) );
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.getRanges = function () {
	return [ this.range ];
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.getCoveringRange = function () {
	return this.range;
};

/**
 * Get the range for this selection
 *
 * @return {ve.Range}
 */
ve.dm.LinearSelection.prototype.getRange = function () {
	return this.range;
};

/**
 * @inheritdoc
 */
ve.dm.LinearSelection.prototype.equals = function ( other ) {
	return this === other || (
		!!other &&
		other.constructor === this.constructor &&
		this.getRange().equals( other.getRange() )
	);
};

/* Registration */

ve.dm.selectionFactory.register( ve.dm.LinearSelection );

/*!
 * VisualEditor Table Selection class.
 *
 * @copyright See AUTHORS.txt
 */

/**
 * @class
 * @extends ve.dm.Selection
 * @constructor
 * @param {ve.Range} tableRange Table range
 * @param {number} fromCol Starting column
 * @param {number} fromRow Starting row
 * @param {number} [toCol] End column
 * @param {number} [toRow] End row
 */
ve.dm.TableSelection = function VeDmTableSelection( tableRange, fromCol, fromRow, toCol, toRow ) {
	// Parent constructor
	ve.dm.TableSelection.super.call( this );

	this.tableRange = tableRange;

	toCol = toCol === undefined ? fromCol : toCol;
	toRow = toRow === undefined ? fromRow : toRow;

	this.fromCol = fromCol;
	this.fromRow = fromRow;
	this.toCol = toCol;
	this.toRow = toRow;
	this.startCol = fromCol < toCol ? fromCol : toCol;
	this.startRow = fromRow < toRow ? fromRow : toRow;
	this.endCol = fromCol < toCol ? toCol : fromCol;
	this.endRow = fromRow < toRow ? toRow : fromRow;
	this.intendedFromCol = this.fromCol;
	this.intendedFromRow = this.fromRow;
	this.intendedToCol = this.toCol;
	this.intendedToRow = this.toRow;
};

/* Inheritance */

OO.inheritClass( ve.dm.TableSelection, ve.dm.Selection );

/* Static Properties */

ve.dm.TableSelection.static.name = 'table';

/* Static Methods */

/**
 * @inheritdoc
 */
ve.dm.TableSelection.static.newFromHash = function ( hash ) {
	return new ve.dm.TableSelection(
		ve.Range.static.newFromHash( hash.tableRange ),
		hash.fromCol,
		hash.fromRow,
		hash.toCol,
		hash.toRow
	);
};

/**
 * Retrieves all cells within a given selection.
 *
 * @static
 * @param {ve.dm.TableMatrix} matrix The table matrix
 * @param {Object} selectionOffsets Selection col/row offsets (startRow/endRow/startCol/endCol)
 * @param {boolean} [includePlaceholders=false] Include placeholders in result
 * @return {ve.dm.TableMatrixCell[]} List of table cells
 */
ve.dm.TableSelection.static.getTableMatrixCells = function ( matrix, selectionOffsets, includePlaceholders ) {
	const cells = [],
		visited = {};

	for ( let row = selectionOffsets.startRow; row <= selectionOffsets.endRow; row++ ) {
		for ( let col = selectionOffsets.startCol; col <= selectionOffsets.endCol; col++ ) {
			let cell = matrix.getCell( row, col );
			if ( !cell ) {
				continue;
			}
			if ( !includePlaceholders && cell.isPlaceholder() ) {
				cell = cell.owner;
			}
			if ( !visited[ cell.key ] ) {
				cells.push( cell );
				visited[ cell.key ] = true;
			}
		}
	}
	return cells;
};

/* Methods */

/**
 * Expand the selection to cover all merged cells
 *
 * @private
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {ve.dm.TableSelection} Expanded table selection
 */
ve.dm.TableSelection.prototype.expand = function ( doc ) {
	const matrix = this.getTableNode( doc ).getMatrix(),
		colBackwards = this.fromCol > this.toCol,
		rowBackwards = this.fromRow > this.toRow;
	let lastCellCount = 0,
		startCol = Infinity,
		startRow = Infinity,
		endCol = -Infinity,
		endRow = -Infinity,
		cells = this.getMatrixCells( doc );

	while ( cells.length > lastCellCount ) {
		// eslint-disable-next-line no-loop-func
		cells.forEach( ( cell ) => {
			startCol = Math.min( startCol, cell.col );
			startRow = Math.min( startRow, cell.row );
			endCol = Math.max( endCol, cell.col + cell.node.getColspan() - 1 );
			endRow = Math.max( endRow, cell.row + cell.node.getRowspan() - 1 );
		} );

		lastCellCount = cells.length;
		cells = this.constructor.static.getTableMatrixCells( matrix, {
			startCol,
			startRow,
			endCol,
			endRow
		} );
	}
	return new this.constructor(
		this.tableRange,
		colBackwards ? endCol : startCol,
		rowBackwards ? endRow : startRow,
		colBackwards ? startCol : endCol,
		rowBackwards ? startRow : endRow
	);
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.toJSON = function () {
	return {
		type: this.constructor.static.name,
		tableRange: this.tableRange,
		fromCol: this.fromCol,
		fromRow: this.fromRow,
		toCol: this.toCol,
		toRow: this.toRow
	};
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.getDescription = function () {
	return (
		'Table: ' +
		this.tableRange.from + ' - ' + this.tableRange.to +
		', ' +
		'c' + this.fromCol + ' r' + this.fromRow +
		' - ' +
		'c' + this.toCol + ' r' + this.toRow
	);
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.collapseToStart = function () {
	return new this.constructor( this.tableRange, this.startCol, this.startRow, this.startCol, this.startRow );
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.collapseToEnd = function () {
	return new this.constructor( this.tableRange, this.endCol, this.endRow, this.endCol, this.endRow );
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.collapseToFrom = function () {
	return new this.constructor( this.tableRange, this.fromCol, this.fromRow, this.fromCol, this.fromRow );
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.collapseToTo = function () {
	return new this.constructor( this.tableRange, this.toCol, this.toRow, this.toCol, this.toRow );
};

/**
 * @inheritdoc
 * @param {ve.dm.Document} doc The document to which this selection applies
 */
ve.dm.TableSelection.prototype.getRanges = function ( doc ) {
	return this.getMatrixCells( doc ).map( ( cell ) => cell.node.getRange() );
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.getCoveringRange = function () {
	// Note that this returns the table range, and not the minimal range covering
	// all cells, as that would be far more expensive to compute.
	return this.tableRange;
};

/**
 * Get all the ranges required to build a table slice from the selection
 *
 * Used when copying table selections.
 *
 * In addition to the outer ranges of the cells, this also includes the start and
 * end tags of table rows, sections and the table itself.
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {ve.Range[]} Ranges
 */
ve.dm.TableSelection.prototype.getTableSliceRanges = function ( doc ) {
	const ranges = [],
		matrix = this.getTableNode( doc ).getMatrix();

	// Arrays are non-overlapping so avoid duplication
	// by indexing by range.start
	function pushNode( n ) {
		const range = n.getOuterRange();
		ranges[ range.start ] = new ve.Range( range.start, range.start + 1 );
		ranges[ range.end - 1 ] = new ve.Range( range.end - 1, range.end );
	}

	// Get the start and end tags of every parent of the cell
	// up to and including the TableNode
	for ( let i = this.startRow; i <= this.endRow; i++ ) {
		let node = matrix.getRowNode( i );
		if ( !node ) {
			continue;
		}
		pushNode( node );
		while ( ( node = node.getParent() ) && node ) {
			pushNode( node );
			if ( node instanceof ve.dm.TableNode ) {
				break;
			}
		}
	}

	return ranges
		// Condense sparse array
		.filter( ( r ) => r )
		// Add cell ranges
		.concat( this.getOuterRanges( doc ) )
		// Sort
		.sort( ( a, b ) => a.start - b.start );
};

/**
 * Get outer ranges of the selected cells
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {ve.Range[]} Outer ranges
 */
ve.dm.TableSelection.prototype.getOuterRanges = function ( doc ) {
	return this.getMatrixCells( doc ).map( ( cell ) => cell.node.getOuterRange() );
};

/**
 * Retrieves all cells within a given selection.
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @param {boolean} [includePlaceholders=false] Include placeholders in result
 * @return {ve.dm.TableMatrixCell[]} List of table cells
 */
ve.dm.TableSelection.prototype.getMatrixCells = function ( doc, includePlaceholders ) {
	return this.constructor.static.getTableMatrixCells(
		this.getTableNode( doc ).getMatrix(),
		{
			startCol: this.startCol,
			startRow: this.startRow,
			endCol: this.endCol,
			endRow: this.endRow
		},
		includePlaceholders
	);
};

/**
 * Check the selected cells are all editable
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {boolean} Cells are all editable
 */
ve.dm.TableSelection.prototype.isEditable = function ( doc ) {
	return this.getMatrixCells( doc ).every( ( cell ) => cell.node.isCellEditable() );
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.isCollapsed = function () {
	return false;
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.translateByTransaction = function ( tx ) {
	const newRange = tx.translateRange(
		this.tableRange,
		// Table selections should always exclude insertions
		true
	);

	if ( newRange.isCollapsed() ) {
		return new ve.dm.NullSelection();
	}
	return new this.constructor( newRange, this.fromCol, this.fromRow, this.toCol, this.toRow );
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.translateByTransactionWithAuthor = function ( tx, authorId ) {
	const newRange = tx.translateRangeWithAuthor( this.tableRange, authorId );

	if ( newRange.isCollapsed() ) {
		return new ve.dm.NullSelection();
	}
	return new this.constructor( newRange, this.fromCol, this.fromRow, this.toCol, this.toRow );
};

/**
 * Check if the selection spans a single cell
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {boolean} The selection spans a single cell
 */
ve.dm.TableSelection.prototype.isSingleCell = function ( doc ) {
	// Quick check for single non-merged cell
	return ( this.fromRow === this.toRow && this.fromCol === this.toCol ) ||
		// Check for a merged single cell by ignoring placeholders
		this.getMatrixCells( doc ).length === 1;
};

/**
 * Check if the selection is mergeable or unmergeable
 *
 * The selection must span more than one matrix cell, but only
 * one table section.
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {boolean} The selection is mergeable or unmergeable
 */
ve.dm.TableSelection.prototype.isMergeable = function ( doc ) {
	if ( !this.isEditable( doc ) ) {
		return false;
	}

	if ( this.getMatrixCells( doc, true ).length <= 1 ) {
		return false;
	}

	const matrix = this.getTableNode( doc ).getMatrix();

	let lastSectionNode;
	// Check all sections are the same
	for ( let r = this.endRow; r >= this.startRow; r-- ) {
		const rowNode = matrix.getRowNode( r );
		if ( !rowNode ) {
			continue;
		}
		const sectionNode = rowNode.findParent( ve.dm.TableSectionNode );
		if ( lastSectionNode && sectionNode !== lastSectionNode ) {
			// Can't merge across sections
			return false;
		}
		lastSectionNode = sectionNode;
	}
	return true;
};

/**
 * Get the selection's table node
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {ve.dm.TableNode} Table node
 */
ve.dm.TableSelection.prototype.getTableNode = function ( doc ) {
	return doc.getBranchNodeFromOffset( this.tableRange.start + 1 );
};

/**
 * Get a new selection with adjusted row and column positions
 *
 * Placeholder cells are skipped over so this method can be used for cursoring.
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @param {number} fromColOffset Starting column offset
 * @param {number} fromRowOffset Starting row offset
 * @param {number} [toColOffset] End column offset
 * @param {number} [toRowOffset] End row offset
 * @param {boolean} [wrap=false] Wrap to the next/previous row if column limits are exceeded
 * @return {ve.dm.TableSelection} Adjusted selection
 */
ve.dm.TableSelection.prototype.newFromAdjustment = function ( doc, fromColOffset, fromRowOffset, toColOffset, toRowOffset, wrap ) {
	if ( toColOffset === undefined ) {
		toColOffset = fromColOffset;
	}

	if ( toRowOffset === undefined ) {
		toRowOffset = fromRowOffset;
	}

	const matrix = this.getTableNode( doc ).getMatrix();
	let wrapDir;

	function adjust( mode, cell, offset ) {
		const dir = offset > 0 ? 1 : -1;
		let nextCell,
			col = cell.col,
			row = cell.row;

		while ( offset !== 0 ) {
			if ( mode === 'col' ) {
				col += dir;
				// Out of bounds
				if ( col >= matrix.getColCount( row ) ) {
					if ( wrap && row < matrix.getRowCount() - 1 ) {
						// Subtract columns in current row
						col -= matrix.getColCount( row );
						row++;
						wrapDir = 1;
					} else {
						break;
					}
				} else if ( col < 0 ) {
					if ( wrap && row > 0 ) {
						row--;
						// Add columns in previous row
						col += matrix.getColCount( row );
						wrapDir = -1;
					} else {
						break;
					}
				}
			} else {
				row += dir;
				if ( row >= matrix.getRowCount() || row < 0 ) {
					// Out of bounds
					break;
				}
			}
			nextCell = matrix.getCell( row, col );
			// Skip if same as current cell (i.e. merged cells), or null
			if ( !nextCell || nextCell.equals( cell ) ) {
				continue;
			}
			offset -= dir;
			cell = nextCell;
		}
		return cell;
	}

	let fromCell = matrix.getCell( this.intendedFromRow, this.intendedFromCol );
	if ( fromColOffset ) {
		fromCell = adjust( 'col', fromCell, fromColOffset );
	}
	if ( fromRowOffset ) {
		fromCell = adjust( 'row', fromCell, fromRowOffset );
	}

	let toCell = matrix.getCell( this.intendedToRow, this.intendedToCol );
	if ( toColOffset ) {
		toCell = adjust( 'col', toCell, toColOffset );
	}
	if ( toRowOffset ) {
		toCell = adjust( 'row', toCell, toRowOffset );
	}

	// Collapse to end/start if wrapping forwards/backwards
	if ( wrapDir > 0 ) {
		fromCell = toCell;
	} else if ( wrapDir < 0 ) {
		toCell = fromCell;
	}

	let selection = new this.constructor(
		this.tableRange,
		fromCell.col,
		fromCell.row,
		toCell.col,
		toCell.row
	);
	selection = selection.expand( doc );
	return selection;
};

/**
 * Check if a given cell is within this selection
 *
 * @param {ve.dm.TableMatrixCell} cell Table matrix cell
 * @return {boolean} Cell is within this selection
 */
ve.dm.TableSelection.prototype.containsCell = function ( cell ) {
	return cell.node.findParent( ve.dm.TableNode ).getOuterRange().equals( this.tableRange ) &&
		cell.col >= this.startCol && cell.col <= this.endCol &&
		cell.row >= this.startRow && cell.row <= this.endRow;
};

/**
 * @inheritdoc
 */
ve.dm.TableSelection.prototype.equals = function ( other ) {
	return this === other || (
		!!other &&
		other.constructor === this.constructor &&
		this.tableRange.equals( other.tableRange ) &&
		this.fromCol === other.fromCol &&
		this.fromRow === other.fromRow &&
		this.toCol === other.toCol &&
		this.toRow === other.toRow
	);
};

/**
 * Get the number of rows covered by the selection
 *
 * @return {number} Number of rows covered
 */
ve.dm.TableSelection.prototype.getRowCount = function () {
	return this.endRow - this.startRow + 1;
};

/**
 * Get the number of columns covered by the selection
 *
 * @return {number} Number of columns covered
 */
ve.dm.TableSelection.prototype.getColCount = function () {
	return this.endCol - this.startCol + 1;
};

/**
 * Check if the table selection covers one or more full rows
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {boolean} The table selection covers one or more full rows
 */
ve.dm.TableSelection.prototype.isFullRow = function ( doc ) {
	const matrix = this.getTableNode( doc ).getMatrix();
	return this.getColCount() === matrix.getMaxColCount();
};

/**
 * Check if the table selection covers one or more full columns
 *
 * @param {ve.dm.Document} doc The document to which this selection applies
 * @return {boolean} The table selection covers one or more full columns
 */
ve.dm.TableSelection.prototype.isFullCol = function ( doc ) {
	const matrix = this.getTableNode( doc ).getMatrix();
	return this.getRowCount() === matrix.getRowCount();
};

/* Registration */

ve.dm.selectionFactory.register( ve.dm.TableSelection );
}( module.exports ) );
