var app = {
  $sidebar : $('#sidebar'),
  $userDialog : $('#user-dialog'),

  toggleSidebar : function() {
    this.$sidebar.toggleClass('hidden');
  },
  toggleUerDialog : function() {
    this.$userDialog.fadeToggle( 300 );
  }
}

$( document ).ready( function()
{
})