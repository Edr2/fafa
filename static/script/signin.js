var Auth = firebase.auth(), form = {
  dom : {
    userForm            : $('#user-form'),
    userFormError       : $('#user-form-error'),
    formToggle          : $('.form-toggle'),
    formToggleText      : $('.form-toggle-text'),
    formToggleContainer : $('.form-toggle-container'),
    formForgot          : $('#forgot-form'),
    socialLogin         : $('.social-signIn'),
    userFormSubmit      : $('#user-form-submit'),
    forgotFormSubmit    : $('#forgot-form-submit'),
    toggleForgot        : $('.toggle-forgot-form')
  },

  state : {
    signUp : false,
    signIn : true,
    provider : false,
    request : {},
    
    toggleState : function() {
      this.signUp = ! this.signUp;
      this.signIn = ! this.signIn;
    },

    removeLoading : function() {
      form.dom.userFormSubmit.removeClass( 'loading' );
    },

    setLoading : function() {
      form.dom.userFormError.text('');
      form.dom.userFormSubmit.addClass( 'loading' );
    }
  },
  init : function() {
    if( form.dom.userForm.length == 0 ) {
      return;
    }

    form.dom.formToggle.click( this.toggleSign );
    form.dom.toggleForgot.click( this.toggleForgotForm );
    form.dom.socialLogin.click( this.auth.sendUserData );
    form.dom.userForm.submit( this.sendUserData );
    form.dom.formForgot.submit( this.auth.resetPassword );

    this.listenAuthChanges();
  },

  toggleForgotForm : function() {
    form.dom.formForgot.find('input[type="email"]').val( form.dom.userForm.find('input[type="email"]').val() );

    form.dom.userForm.toggle( 200 );
    form.dom.formToggleContainer.toggle( 200 );
    form.dom.formForgot.toggle( 200 );
  },

  listenAuthChanges : function() {
    Auth.onAuthStateChanged( function( user ) {
      if( user ) {
        let location = form.state.request.newUser ? 'step_two' : '/';
        let remember = form.state.request.userData && form.state.request.userData.remember && form.state.request.userData.remember == 'on' ? true : false;

        let authRequestCallback = function() {
          document.location = location;
        }

        if( form.state.request.pendingCred ) {
          user.linkAndRetrieveDataWithCredential( form.state.request.pendingCred );
        }

        user.getIdToken().then( function( idToken ) {
          utils.sendRequest('POST', '/auth', {
            token    : idToken,
            remember : remember
          },
          authRequestCallback)
        });
      }
    });
  },

  sendUserData : function( event ) {
    event.preventDefault();
    form.state.setLoading();

    if( this.dataset.provider ) {
      form.auth.socialSignIn();
      return;
    }

    let userData = {};
    let arr = form.dom.userForm.serializeArray();
    let actionType = form.state.signUp ? 'signUp' : 'signIn';
    
    arr.forEach( function( field ) {
      userData[field.name] = field.value;
    });

    form.state.request.userData = userData;

    if( actionType == 'signUp' )
    {
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
  
  auth : {
    handleErrors : function( error ) {
      if( error ) {
        if(error.code === 'auth/account-exists-with-different-credential')
        {
          form.state.request.pendingCred = error.credential;

          form.state.request.email = error.email

          Auth.fetchSignInMethodsForEmail( form.state.request.email ).then( function( methods ) {
            if (methods[0] === 'password') {
              form.dom.userFormError.text(
                'This email is already registered. Please sign in with your password'
              )
            }
            else {
              var provider = methods[0].indexOf('facebook') !== -1 ? 'facebook' : 'google';

              form.dom.userFormError.text(`This email is already associated with ${provider} account. Please sign in to link that account.`
              )
            }
            form.state.removeLoading();
          });
        }
        else {
          form.dom.userFormError.text( error.message );
          form.state.removeLoading();
        }
      }
    },

    registerUser : function( userData ) {
      Auth.createUserWithEmailAndPassword( userData.email, userData.password )
      .then( form.auth.handleNewUser )
      .catch( form.auth.handleErrors );
    },
    
    emailLogin : function( userData ) {
      Auth.signInWithEmailAndPassword( userData.email, userData.password )
      .catch( form.auth.handleErrors );    
    },

    socialSignIn : function( provider ) {
      var provider = new firebase.auth[this.dataset.provider]();

      Auth.signInWithPopup( provider )
      .then( form.auth.handleNewUser )
      .catch( form.auth.handleErrors );
    },

    resetPassword : function( event ) {
      event.preventDefault();

      Auth.sendPasswordResetEmail( form.dom.formForgot.find('[type="email"]').val() ).then( function( response ) {
        // Email sent.
        debugger
      })
      .catch( form.auth.handleErrors );
    },

    handleNewUser : function( user ) {
      let userName = $('#user-form [name="username"]').val();

      form.state.request.newUser = user.additionalUserInfo.isNewUser;

      if( userName ) {
        Auth.currentUser.updateProfile({
            displayName: userName
        });
      }
    }
  },

  toggleSign : function( e ) {
    form.state.toggleState();

    form.dom.userFormSubmit.text( form.state.signUp ? 'Sign up' : 'Sign in' );
    form.dom.formToggle.text( !form.state.signUp ? 'Sign up' : 'Sign in' );
    form.dom.formToggleText.text( !form.state.signUp ? 'Don\'t have an account?' : 'Already registered?' );

    ['signUp', 'signIn'].forEach( function( className ) {
      $(`.${className}`).slideToggle( 300 );
    })
  },
}

$( document ).ready( function()
{
  form.init();
})