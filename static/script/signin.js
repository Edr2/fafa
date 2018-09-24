var Auth = firebase.auth(), form = {

  // keeping all dom object assigned once might give slight performance boost
  dom : {
    userForm            : $('#user-form'),
    userFormSubmit      : $('#user-form-submit'),
    socialLogin         : $('.social-login'),
    formToggle          : $('.form-toggle'),
    formToggleText      : $('.form-toggle-text'),
    formToggleContainer : $('.form-toggle-container'),
    forgotForm          : $('#forgot-form'),
    toggleForgot        : $('.toggle-forgot-form'),
    forgotFormSubmit    : $('#forgot-form-submit'),
    secretForm          : $('#secret-form')
  },

  state : {
    signUp : false,
    signIn : true,
    provider : false,
    request : {},
    currentForm : 'secretForm',

   /**
    * Toggles user state
    */
    toggleState : function() {
      this.signUp = ! this.signUp;
      this.signIn = ! this.signIn;
    },

    removeLoading : function() {
      $('button.loading').removeClass( 'loading' );
    },

   /**
    * Removes error text for current active form, set's activated button loading
    */
    setLoading : function( event ) {
      form.dom[form.state.currentForm].find('.error').text('');

      if( $( event.target ).is('form') ) {
        form.dom[form.state.currentForm].find('[type="submit"]').addClass( 'loading' );
      }
      else {
        $( event.target ).addClass('loading');
      }
    }
  },

 /**
  * Main method, launches event handlers on page init
  */
  init : function() {
    form.dom.secretForm.submit( this.handleUserData );
    
    // if userForm exists
    if( form.dom.userForm.length > 0 ) {
      form.state.currentForm = 'userForm';

      form.dom.formToggle.click( this.toggleSign );
      form.dom.toggleForgot.click( this.toggleForgotForm );
      form.dom.socialLogin.click( this.handleUserData );
      form.dom.userForm.submit( this.handleUserData );
      form.dom.forgotForm.submit( this.handleUserData );
    }
  },

 /**
  * Toggles forgot form, hides/ reveals unnecessary content
  * transfers email from user form to forgot form
  */
  toggleForgotForm : function() {
    form.dom.forgotForm.find('input[type="email"]').val( form.dom.userForm.find('input[type="email"]').val() );

    form.state.currentForm = form.dom.userForm.is(':visible') ? 'forgotForm' : 'userForm';

    form.dom.userForm.slideToggle( 300 );
    form.dom.formToggleContainer.slideToggle( 300 );
    form.dom.forgotForm.slideToggle( 300 );
  },

 /**
  * Main method for handling all kinds of request
  */
  handleUserData : function( event ) {
    let userData = {};

    event.preventDefault();

    // if request is still not resolved
    if( $( event.target ).is('loading') ) {
      return;
    }

    form.state.setLoading( event );

    // if button has provider specified, launch social login by provider
    if( event.target.dataset.provider ) {
      form.auth.socialSignIn( event.target.dataset.provider );
      return;
    }

    // if forgot form is active now
    if( form.state.currentForm == 'forgotForm' ) {
      form.auth.resetPassword( event );
      return;
    }
    
    // if secret form is active now
    if( form.state.currentForm == 'secretForm' ) {
      form.auth.sendUserSecret( event )
      return;
    }

    // for regular signIn/ signUp, parse form data to object
    form.dom.userForm.serializeArray().forEach( function( field ) {
      userData[field.name] = field.value;
    });

    // persist form data in main object for async handling
    form.state.request.userData = userData;

    if( form.state.signUp )
    {
      // custom password validation
      if( userData.password !== userData.password2 ) {
        form.auth.handleErrors({ message : 'Password not same' });
        return;
      }

      form.auth.registerUser( userData );
    }
    else {
      form.auth.emailLogin( userData );
    }
  },
  
 /**
  * Object that contains all authentication methods
  */
  auth : {

   /**
    * Handles errors in all requests
    */
    handleErrors : function( error ) {
      if( error ) {
        // custom handling for existing account with different credential
        if(error.code === 'auth/account-exists-with-different-credential')
        {
          // keep recieved credential
          form.state.request.pendingCred = error.credential;
          form.state.request.email = error.email

          // get all sign in methods available for this email
          Auth.fetchSignInMethodsForEmail( form.state.request.email ).then( function( methods ) {
            // according to first method received,
            // ask user to sign with this method in order to link new provider
            if (methods[0] === 'password') {
              form.dom[form.state.currentForm].find('.error').text(
                'This email is already registered. Please sign in with your password to link that account.'
              )
            }
            else {
              var provider = methods[0].indexOf('facebook') !== -1 ? 'facebook' : 'google';

              form.dom[form.state.currentForm].find('.error').text(`This email is already associated with ${provider} account. Please sign in to link that account.`
              )
            }
            form.state.removeLoading();
          });
        }
        else {
          // for any other kind of error, show error message to user
          form.dom[form.state.currentForm].find('.error').text( error.message || error.statusText );
          form.state.removeLoading();
        }
      }
    },

   /**
    * Register new user with email and password
    * 
    * @param Object - object with user email and pass
    */
    registerUser : function( userData ) {
      Auth.createUserWithEmailAndPassword( userData.email, userData.password )
      .then( form.auth.handleAuth )
      .catch( form.auth.handleErrors );
    },
    
  /**
    * Login user with email and password
    * 
    * @param Object - object with user email and pass
    */
    emailLogin : function( userData ) {
      Auth.signInWithEmailAndPassword( userData.email, userData.password )
      .then( form.auth.handleAuth )
      .catch( form.auth.handleErrors );    
    },


   /**
    * Create / login user with social provider
    * 
    * @param string - provider name
    */
    socialSignIn : function( providerName ) {
      var provider = new firebase.auth[ providerName ]();

      Auth.signInWithPopup( provider )
      .then( form.auth.handleAuth )
      .catch( form.auth.handleErrors );
    },

   /**
    * Send reset email to user
    */
    resetPassword : function( event ) {
      event.preventDefault();

      Auth.sendPasswordResetEmail( form.dom.forgotForm.find('[type="email"]').val() )
      .then( function( response ) {
        
      })
      .catch( form.auth.handleErrors );
    },

   /**
    * Main method for server response handling
    * 
    * @param Object - server response after successful signIn / signUp
    */
    handleAuth : function( response ) {
      let userName = form.state.request.userData ? form.state.request.userData.username : false;

      // defines cookie expiration time
      let remember = form.state.request.userData && form.state.request.userData.remember && form.state.request.userData.remember == 'on' ? true : false;

      // if userName specified on signIn, update firebase with this displayName
      if( userName ) {
        Auth.currentUser.updateProfile({
            displayName: userName
        });
      }

      // if user already tried to login and login failed due to
      // existing different credential error, then
      // link that credential to current user
      if( form.state.request.pendingCred ) {
        response.user.linkAndRetrieveDataWithCredential( form.state.request.pendingCred );
      }

      // after all additional steps taken, send user token to server
      // for proper cookies management
      response.user.getIdToken().then( function( idToken ) {
        utils.sendRequest('POST', '/auth', {
          token    : idToken,
          remember : remember
        },
        function( response ) {
          // on succesfull response, redirect user to main page
          // with cookie specified, server can define wether to ask user for token/ secret or send him directly to profile
          if( response.status == 'success' ) {
            document.location = '/';
          }
        },
        form.auth.handleErrors );
      });
    },

   /**
    * Method for sending custom user secret / token
    */
    sendUserSecret : function( event ) {
      event.preventDefault();
      let userData = {};

      // retrieves data from form
      form.dom.secretForm.serializeArray().forEach( function( field ) {
        userData[field.name] = field.value;
      });

      utils.sendRequest('POST', '/step_two', {
        token  : userData.token,
        secret : userData.secret
      },
      function( response ) {
        form.state.removeLoading();
        if( response.status == 'success' ) {
          document.location = '/';
        }
      },
      form.auth.handleErrors );
    }
  },

 /**
  * Toggles form state between signUp / signIn
  */
  toggleSign : function( e )
  {
    form.state.toggleState();

    let key = form.state.signUp ? 'signUp' : 'signIn';
    let text = {
      signUp : {
        userFormSubmit : 'Sign up',
        formToggle : 'Sign in',
        formToggleText : 'Don\'t have an account?'
      },
      signIn : {
        userFormSubmit : 'Sign in',
        formToggle : 'Sign up',
        formToggleText : 'Already registered?'
      }
    }

    // change text content, based on current form state
    form.dom.userFormSubmit.text( text[key].userFormSubmit );
    form.dom.formToggle.text( text[key].formToggle );
    form.dom.formToggleText.text( text[key].formToggleText );
    
    // make hidden fields required when form is in sinUp state
    if( form.state.signUp ) {
      form.dom.userForm.find('input.signUp').attr('required', true );
    }
    else {
      form.dom.userForm.find('input.signUp').removeAttr('required');
    }

    // animate toggling of signUp / signIn specific content
    ['signUp', 'signIn'].forEach( function( className ) {
      $(`.${className}`).slideToggle( 300 );
    })
  },
}

$( document ).ready( function()
{
  form.init();
})