var form = {
  dom : {
    userForm            : $('#user-form'),
    userFormError       : $('#user-form-error'),
    formToggle          : $('#form-toggle'),
    formForgot          : $('#forgot-form'),
    socialLogin         : $('.social-signIn'),
    userFormSubmit      : $('#user-form-submit'),
    forgotFormSubmit    : $('#forgot-form-submit'),
    toggleForgot        : $('.toggle-forgot-form'),
    formToggleContainer : $('.form-toggle-container')
  },

  state : {
    signUp : false,
    signIn : true,
    provider : false,

    toggleState : function() {
      this.signUp = ! this.signUp;
      this.signIn = ! this.signIn;
    },

    removeLoading : function() {
      form.dom.userForm.find('button[type="submit"]').removeClass( 'loading' );
    },

    setLoading : function() {
      form.dom.userForm.find('button[type="submit"]').addClass( 'loading' );

      form.dom.userFormError.text('');
    }
  },
  init : function() {
    form.dom.userForm.submit( this.sendUserData );
    form.dom.formForgot.submit( this.auth.resetPassword );
    form.dom.formToggle.click( this.toggleSign );
    form.dom.socialLogin.click( this.auth.socialSignIn );
    form.dom.toggleForgot.click( this.toggleForgotForm );

    this.listenAuthChanges();
  },

  toggleForgotForm : function() {
    form.dom.formForgot.find('input[type="email"]').val( form.dom.userForm.find('input[type="email"]').val() );

    form.dom.userForm.toggle( 200 );
    form.dom.formToggleContainer.toggle( 200 );
    form.dom.formForgot.toggle( 200 );
  },

  listenAuthChanges : function() {
    firebase.auth().onAuthStateChanged(function(user) {
      form.state.removeLoading();
      if (user) {
        console.log('user data : ', user);
      }
      else {
        console.log('logout');
      }
    });
  },

  sendUserData : function( event ) {
    event.preventDefault();
    
    let obj = {};
    let arr = form.dom.userForm.serializeArray();
    let actionType = form.state.signUp ? 'signUp' : 'signIn';

    form.state.setLoading();
    
    arr.forEach( function( field ) {
      obj[field.name] = field.value;
    });

    if( actionType == 'signUp' )
    {
      if( !form.validatePassword( arr ) ) {
        form.state.removeLoading();
        return;
      }

      form.auth.registerUser( obj );
    }
    else {
      form.auth.emailLogin( obj );
    }
  },
  
  auth : {
    handleErrors : function( message )
    {
      debugger
      form.dom.userFormError.text( message );

      form.state.removeLoading();
    },

    registerUser : function( obj ) {
      firebase.auth().createUserWithEmailAndPassword(obj.email, obj.password)
      .catch( form.auth.handleErrors );
    },
    
    emailLogin : function( obj ) {
      firebase.auth().signInWithEmailAndPassword(obj.email, obj.password)
      .catch( form.auth.handleErrors );    
    },

    socialSignIn : function( event ) {
      var provider = new firebase.auth[this.dataset.provider]();

      firebase.auth().signInWithPopup(provider).then(function(result) {
        form.state.removeLoading();
        var user = result.user;
      })
      .catch( form.auth.handleErrors );
    },

    resetPassword : function( event ) {
      event.preventDefault();

      firebase.auth().sendPasswordResetEmail( form.dom.formForgot.find('[type="email"]').val() ).then( function( response ) {
        // Email sent.
        debugger
      })
      .catch( form.auth.handleErrors );
    }
  },

  toggleSign : function( e ) {
    form.state.toggleState();

    let key = form.state.signUp ? 'Sign up' : 'Sign in';
    
    form.dom.userFormSubmit.text( key );
    form.dom.formToggle.text( key );

    ['signUp', 'signIn'].forEach( function( className ) {
      $(`.${className}`).slideToggle( 300 );
    })
  },

  validatePassword : function( array )
  {
    let password, confirm, $confirm = $('#confirm');

    array.forEach( function( field ) {
      if( field.name == 'password' ) {
        password = field.value;
      }
      if( field.name == 'password2' ) {
        confirm = field.value
      }
    });

    if( password !== confirm ) {
      $confirm.addClass('is-invalid');
    }
    else {
      $confirm.removeClass('is-invalid');
    }

    return password === confirm;
  },

}

$( document ).ready( function()
{
  form.init();
})