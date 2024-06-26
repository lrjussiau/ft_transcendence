function initializeFriendSearch() {
    $(document).ready(function() {
        const friends = [
            { name: 'John Doe', id: 1 },
            { name: 'Jane Smith', id: 2 },
            { name: 'Nike Johnson', id: 3 },
            { name: 'Mikey Jahnson', id: 4 },
            { name: 'Mike Johnson', id: 5 }
        ];

        $('#searchInput').on('input', function() {
            const query = $(this).val().toLowerCase();
            const filteredFriends = friends.filter(friend => friend.name.toLowerCase().includes(query));

            $('#searchResults').empty();
            if (filteredFriends.length > 0) {
                filteredFriends.forEach(friend => {
                    $('#searchResults').append(`
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            ${friend.name}
                            <button class="btn btn-sm modal-button add-friend-btn" data-id="${friend.id}">Add Friend</button>
                        </div>
                    `);
                });
            } else {
                $('#searchResults').append('<div class="list-group-item">No friends found</div>');
            }
        });

        $(document).on('click', '.add-friend-btn', function() {
            const friendId = $(this).data('id');
            // Implement the logic to add the friend using the friendId
            alert('Friend with ID ' + friendId + ' added!');
        });
    });
}