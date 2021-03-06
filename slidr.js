Slidr = function ( options ) {

	var that = this;

	// Make sure the user has passed the correct
	check( options, Object );
	check( options.views, Array );

	// This will be setup on init
	that.views = [];

	// ___

	// Handling of the slides
	that.slides = {};

	// Method for getting the value of simultaneousSlides (either
	// from a passed function or from just the stored value)
	that.slides.getSimultaneousSlides = function( viewOptions ) {

		// If simultaneousSlides is a function, do this!
		if (typeof viewOptions.simultaneousSlides === 'function')
			return viewOptions.simultaneousSlides();

		// Else just return the value
		return viewOptions.simultaneousSlides;

	};

	// This is for view with the "slide" fadeType.
	// They need to update their size on browser window resize
	that.slides.bindWindowResizeEvents = function( viewOptions ) {

		// Only "slide" fadeType should be affected
		if (viewOptions.fadeType !== 'slide')
			return false;

		$(window).on('resize', _.throttle( function() {
			that.slides.slide( viewOptions );
		}, 250 ) );

	};

	// Init all slides
	that.slides.init = function( views ) {

		// For all differet views, setup visibility and init buttons
		_.each(views, function( viewOptions ){
			that.slides.setupVisibility( viewOptions );
			that.slides.bindWindowResizeEvents( viewOptions );
			that.nextPrevBtns.init( viewOptions );
			that.pagination.init( viewOptions );
		});

	};

	that.slides.fadeIn = function( viewOptions ) {

		// Hide all slides
		$(viewOptions.slides).hide();

		// Show the first + simultaneousSlides slides
		var ss = that.slides.getSimultaneousSlides( viewOptions );
		var startSlideIndex = that.slides.active.get();

		$(viewOptions.slides)
		.slice( startSlideIndex, startSlideIndex+ss )
		.fadeIn( viewOptions.fadeDuration );

	};

	that.slides.slideResetPosition = function( viewOptions ) {

		// …and the inner wrapper, also animate the slide!
		$(viewOptions.wrapper)
		.find('.slider-inner-wrapper')
		.css({ marginLeft: -$(viewOptions.slides).outerWidth() * that.slides.active.get() });

	};

	that.slides.slideSetupSizes = function( viewOptions ) {

		// Check if slides are already wrapped, if not: wrap!
		// Also: add swipe functionality
		if ($(viewOptions.wrapper).find('.slider-inner-wrapper').length <1 ) {

			// Wrap the inner els
			$(viewOptions.slides).wrapAll('<div class="slider-inner-wrapper">');

			// Add the pan event
			var innerWrapper = $(viewOptions.wrapper).find('.slider-inner-wrapper')[0];
			var swipeableInnerWrapper = new Hammer( innerWrapper );
			swipeableInnerWrapper.on('panleft panright', _.debounce( function( e ) {
				
				if (e.type === 'panleft')
					that.slides.active.set( that.slides.active.get()+1 );
				
				else
					that.slides.active.set( that.slides.active.get()-1 );

				return that.timer.stop();

			}, 150, true) );

		}

		// Set the width of the slides … 
		$(viewOptions.slides)
		.width( $(viewOptions.wrapper).width() / that.slides.getSimultaneousSlides( viewOptions ) );

		// …and the inner wrapper, also animate the slide!
		$(viewOptions.wrapper)
		.find('.slider-inner-wrapper')
		.width( $(viewOptions.slides).outerWidth() * $(viewOptions.slides).length + 10 );

	};

	that.slides.slide = function( viewOptions ) {

		that.slides.slideSetupSizes( viewOptions );

		// Animate the slide!
		$(viewOptions.wrapper)
		.find('.slider-inner-wrapper')
		.animate({
			marginLeft: -$(viewOptions.slides).outerWidth() * that.slides.active.get()
		}, 150);

	};

	// Method for setting up the visibility of the slideshow's slides
	that.slides.setupVisibility = function( viewOptions ) {

		if (viewOptions.fadeType === 'fadeIn')
			that.slides.fadeIn( viewOptions );

		if (viewOptions.fadeType === 'slide')
			that.slides.slide( viewOptions );

		// Update the active paginations button
		that.pagination.setActive();

		// Update the prev/next buttons
		that.nextPrevBtns.updateVisibility( viewOptions );

		if (Match.test( viewOptions.slideCallback, Function ))
			viewOptions.slideCallback( viewOptions );

		if (Match.test( that.globalSlideCallback, Function ))
			that.globalSlideCallback();

	};

	// Method for updating the visibilty of the slides
	that.slides.updateVisibility = _.debounce( function ( views ) {
		_.each(views, that.slides.setupVisibility );
	}, 50, true );

	that.slides.active = {
		currentValue: 0
	};

	that.slides.active.get = function() {
		return that.slides.active.currentValue;
	};

	that.slides.active.set = function( value ) {
		check( value, Number );
		that.slides.active.currentValue = that.slides.active.check( value );
		return that.slides.updateVisibility( that.views );
	};

	that.slides.active.check = function( value ) {

		// The first view which gets passed is the primary view
		viewOptions = that.views[0];

		// Get the last slide, and the number of the last slide which takes simultaneousSlides
		// into consideration
		var lastSlide = viewOptions.slides.length;
		var lastSlideWithSimultaneous = lastSlide - that.slides.getSimultaneousSlides( viewOptions );

		// If the active slide is less than 0, it don't exist.
		// Either set it back to 0, or go to the last item (depending on whether
		// it's a carousel or not)
		if (value < 0) {
			if (that.carousel)
				return lastSlideWithSimultaneous;
			else
				return 0;
		}

		// If the active slide is higher than the last slide, handle that.
		if (value >= lastSlideWithSimultaneous ) {
			// Is it a carousel and the active slide is actually higher than the very
			// lastSlideWithSimultaneous slide? Then go back to the first slide.
			if (that.carousel && value > lastSlideWithSimultaneous) {
				return 0;
			}
			else {
				// So, we've entered a slide which is higher than the last one and 
				// the slideshow is not a carousel. This means we can stop the timers?
				if (!that.carousel)
					that.timer.stop();
				return lastSlideWithSimultaneous;
			}
		}

		return value;

	};



	// ___

	// Handling of timers
	that.timer = {};

	// The time gets set on setup
	that.timer.time = 0;

	// The current timer ( gets set in timer.startTimer() )
	that.timer.timer = false;

	// Method for stopping the timer
	that.timer.stop = function() {
		return Meteor.clearInterval( that.timer.timer );
	};

	// Method for starting the timer
	that.timer.startTimer = function( time ) {

		// If timer is not set, don't do anything
		if (time < 1)
			return false;

		that.timer.timer = Meteor.setInterval(function () {
			that.slides.active.set( that.slides.active.get()+1 );
		}, time );
		
	};

	// ___

	// Handling of all pagination
	that.pagination = {};

	// Holder for all the current pagination wrapper (could be one for each view)
	that.pagination.wrappers = [];

	that.pagination.wrappersGetById = function( _id ) {
		return _( that.pagination.wrappers ).findWhere({ _id: _id });
	};

	// Setup pagination for a view
	that.pagination.init = function( viewOptions ) {

		// If there is no pagination object set, stop here.
		if (!viewOptions.pagination)
			return false;

		// Check if there is a currently created pagination, if so: delete it and create a new one!
		var currentWrapper = that.pagination.wrappersGetById( viewOptions._id );
		if ( currentWrapper ) {
			// Remove the element from the DOM…
			$(currentWrapper.wrapper).remove();
			// …and from the pagination.wrappers array
			that.pagination.wrappers = _.reject( that.pagination.wrappers, function( wrapper ){ return wrapper._id === viewOptions._id; });
		}

		// Create the wrapper pagination element
		var wrapper = $('<'+viewOptions.pagination.wrapper+' />')
		.addClass( viewOptions.pagination.wrapperClass );

		// Holder for all indicators
		var indicators = [];

		var lastSlide = viewOptions.slides.length;
		var lastSlideWithSimultaneous = lastSlide - that.slides.getSimultaneousSlides( viewOptions );

		// Create the indicators
		_.each(viewOptions.slides, function( slide, index ){

			if (index > lastSlideWithSimultaneous)
				return false;

			var indicatorText = index + 1;
			if (viewOptions.pagination.paginationContent){
				if ( Match.test(viewOptions.pagination.paginationContent, String) )
					indicatorText = viewOptions.pagination.paginationContent;
				else{
					indicatorText = viewOptions.pagination.paginationContent( slide );
				}
			}

			indicators.push(
				$('<'+viewOptions.pagination.indicators+'/>')
				.text( indicatorText )
				.addClass( viewOptions.pagination.indicatorsClass )
				.on('click', function () {
					// Set the active slide on click
					that.slides.active.set( index );
					// Stop all timers on click
					that.timer.stop();
				})

			);

			// Add this indicator to the wrapper
			wrapper.append( indicators[index] );

		});

		// Append the wrapper to the containing slideshow element
		if (viewOptions.pagination.paginationPlacement && viewOptions.pagination.paginationPlacement === 'before') {
			$( viewOptions.wrapper ).prepend( wrapper );
		}
		else {
			$( viewOptions.wrapper ).append( wrapper );
		}

		// Add the wrapper and some other dat to the pagination.wrappers array
		that.pagination.wrappers.push({
			_id: viewOptions._id,
			wrapper: $(wrapper)[0],
			indicatorSelector: viewOptions.pagination.indicators,
			indicatorClass: viewOptions.pagination.indicatorsClass
		});

		// Updat the active pagination item as well!
		that.pagination.setActive();

	};

	// Method for setting the currently active pagination itemr
	that.pagination.setActive = function () {

		// Make sure there are pagination wrappers at all
		if (that.pagination.wrappers.length < 1)
			return false;

		// Iterate over all the pagination wrappers
		return _.each(that.pagination.wrappers, function( wrapper ){
			
			// Get the indicators and set the active class
			var activeClass = wrapper.indicatorClass + '--active';
			var indicators = $(wrapper.wrapper).find(wrapper.indicatorSelector);

			// Remove the active class from all the indications, but add it
			// to the currently active slide
			indicators.removeClass( activeClass );
			$(indicators[ that.slides.active.get() ]).addClass( activeClass );
		
		});

	};


	// ___

	// Handling of the next/prev buttons
	that.nextPrevBtns = {};

	// Init the next/prev buyttons
	that.nextPrevBtns.init = function( viewOptions ) {

		// Don't do anything unless user has passed controls as an option to the views options
		if (!viewOptions.controls)
			return false;

		check( viewOptions.controls, Array );

		that.nextPrevBtns.bindEvents( viewOptions.controls );

	};

	that.nextPrevBtns.updateVisibility = function( viewOptions ) {

		// If showControls is false, don't do nothing
		if(!viewOptions.showControls)
			return false;

		// If this slideshow is a carousel, do nothing
		if(that.carousel)
			return false;

		// Make sure the base class has been set
		if (!viewOptions.controlsBaseClass)
			return false;
		
		var lastSlide = viewOptions.slides.length;
		var lastSlideWithSimultaneous = lastSlide - that.slides.getSimultaneousSlides( viewOptions );
		var currentSlide = that.slides.active.get();

		// Set the active class, and remove it from all elements
		var activeClass = viewOptions.controlsBaseClass + '--inactive';
		$(viewOptions.controls).removeClass( activeClass );

		// If the first slide is active, disable the first control
		if (currentSlide === 0)
			$(viewOptions.controls).first().addClass( activeClass );

		// If the last slide (minust simultatneous) is active, disable the last control
		if (currentSlide === lastSlideWithSimultaneous)
			$(viewOptions.controls).last().addClass( activeClass );

	};

	// Method for binding the events to the next/prev buttons
	that.nextPrevBtns.bindEvents = function( els ) {
		
		// The first el will get the "prev" goto, the last will get the "next" goto
		$(els).first().data('goto', -1);
		$(els).last().data('goto', 1);

		// Bind click event which uses the goto data propert (set above) to
		// set the currently active slide
		$(els).off().on('click', function () {
			that.slides.active.set( that.slides.active.get() + $(this).data('goto') );
			// Stop the timer on click!
			that.timer.stop();
		});

	};


	// ___

	that.setup = {};

	// Method for checking if passed object is a node
	that.setup.isDOMNode = function(o){
		return (
			typeof HTMLElement === "object" ? o instanceof HTMLElement :
			o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
		);
	};

	// Method for checking passed viewOptions from the user
	that.setup.checkViewOptions = function ( viewOptions ) {

		var errors = [];

		// Check passed wrapper
		if ( !that.setup.isDOMNode( viewOptions.wrapper ) )
			errors.push('viewOptions.wrapper, must be HTMLElement');

		check( viewOptions.slides, Array );

		// Optionals
		if ( viewOptions.controls ) {
			check( viewOptions.controls, Array );
			if ( viewOptions.controls.length !== 2)
				errors.push('viewOptions.controls must contain only two elements!');
		}
		if ( viewOptions.simultaneousSlides )
			// simultaneousSlides can be a function, if not it must be a number!
			if (typeof viewOptions.simultaneousSlides !== 'function') {
				check( viewOptions.simultaneousSlides, Number );
			}
			else {
				// Start autotracking the value
				Tracker.autorun(function () {
					var simValue = viewOptions.simultaneousSlides();
					that.pagination.init( viewOptions );
					that.slides.slideSetupSizes( viewOptions );
					that.slides.slideResetPosition( viewOptions );
				});
			}
		if ( viewOptions.fadeType )
			check( viewOptions.fadeType, String );
		if ( viewOptions.fadeDuration )
			check( viewOptions.fadeDuration, Number );
		if ( viewOptions.showControls )
			check( viewOptions.showControls, Boolean );

		// Pagination object
		if ( viewOptions.pagination ) {
			
			check( viewOptions.pagination, Object );

			// Check the passed pagination values
			check( viewOptions.pagination.wrapper, String );
			check( viewOptions.pagination.indicators, String );

			// Optionals
			if ( viewOptions.pagination.wrapperClass )
				check( viewOptions.pagination.wrapperClass, String );
			if ( viewOptions.pagination.indicatorsClass )
				check( viewOptions.pagination.indicatorsClass, String );
			if ( viewOptions.pagination.paginationContent ){
				if (!Match.test( viewOptions.pagination.paginationContent, String ) &&
					!Match.test( viewOptions.pagination.paginationContent, Function )){
					throw new Error('paginationContent must be a String or Function!');
				}
			}
			if ( viewOptions.pagination.paginationPlacement )
				check( viewOptions.pagination.paginationPlacement, String );

		}
		
		if (errors.length < 1)
			return false;

		return errors;

	};

	that.setup.setViewOptionDefault = function ( viewOptions ) {
		
		viewOptions._id = Meteor.uuid();
		viewOptions.simultaneousSlides = viewOptions.simultaneousSlides || 1;
		viewOptions.fadeType = viewOptions.fadeType                     || 'fadeIn';
		viewOptions.fadeDuration = viewOptions.fadeDuration             || 250;
		viewOptions.showControls = viewOptions.showControls             || true;

		return viewOptions;

	};

	// Setup all views
	that.setup.views = function ( views ) {

		check( views, Array );

		// Map over all the views
		return _.map(views, function( viewOptions ){

			// Setup default view options
			viewOptions = that.setup.setViewOptionDefault( viewOptions );
			
			// Make sure there are no errors which the user has passed
			var setupErrors = that.setup.checkViewOptions( viewOptions );
			if (setupErrors)
				throw new Error(setupErrors);

			return viewOptions;
		
		});

	};

	// Method for setting and checking global options
	that.setup.setupGlobalOptions = function ( options ) {

		if ( options.timer )
			check( options.timer, Number );
		if ( options.carousel )
			check( options.carousel, Boolean );
		if ( options.slideCallback )
			check( options.slideCallback, Function );
		
		that.timer.time = options.timer  || 6500;
		that.carousel = options.carousel;
		that.globalSlideCallback = options.slideCallback;

		return true;

	};


	// Self exectuing inti() method
	that.init = function() {

		// Setup/check the global options
		that.setup.setupGlobalOptions( options );

		// Setup the views
		that.views = that.setup.views( options.views );

		// Setup the slides
		that.slides.init( that.views );

		// Start the timer
		that.timer.startTimer( options.timer );

	}();
	
};