var app = {
  dom : {
    sidebar          : $('#sidebar'),
    userDialog       : $('#user-dialog'),
    userProfile      : $('#user-profile-photo'),
    uploadButton     : $('#upload-button'),
    uploadMenu       : $('#upload-menu'),
    userProfilePhoto : $('#user-profile-photo img'),
  },

  toggleSidebar : function() {
    this.sidebar.toggleClass('hidden');
  },
  toggleUerDialog : function() {
    this.userDialog.fadeToggle( 300 );
  },

  init : function() {
    app.dom.uploadButton.click( this.upload.toggleUploadMenu );

    this.listenAuthChanges();
  },

  upload : {
    toggleUploadMenu : function( event ) {
      app.dom.uploadMenu.slideToggle( 200 );

      console.log('Menu opened');
    },

  },
  

  listenAuthChanges : function() {
    Auth.onAuthStateChanged( function( user ) {
      if( user ) {
        let photoUrl = user.providerData[0] ? user.providerData[0].photoURL : user.photoURL;
        
        app.dom.userProfilePhoto.attr('src', photoUrl )
        app.dom.userProfile.removeClass('loading');

        console.log('user : ', user );
      }
    });
  }
}

$( document ).ready( function()
{
  app.init();
})