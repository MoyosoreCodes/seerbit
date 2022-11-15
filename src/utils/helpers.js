
module.exports = {
    eventActions : {
        JOIN: 'JOIN', 
        KICK: 'KICK',
        CHANGE_OWNER : 'CHANGE_OWNER'
    },
	select : {
		public_event_fields: 'name qrcode is_verified username avatar followersCount followers following followingCount events products'
	},
	populate : {
		public_user_fields : [
            {
                path: 'followers',
                select: 'avatar username id',
                model: "User"
            },
            {
                path: 'following',
                select: 'avatar username id',
                model: "User"
            },
            {
                path: 'events',
                model: "Event",
                select: 'id name image type status class start_date is_live amount isScheduled participantCount event_code access_fee'
            },
            {
                path: 'products',
                model: "Products"
            }
        ],
        private_user_fields : [
            {
                path: 'followers',
                select: 'avatar username id',
                model: "User"
            },
            {
                path: 'following',
                select: 'avatar username id',
                model: "User"
            },
            {
                path: 'bookmarks',
                populate: {
                    path: 'products',
                    model: "Products"
                }
            },
            {
                path: 'subscribed_events',
                select: '-qrcode -tags -products -participants',
                model: "Event"
            },
            {
                path: 'events',
                model: "Event"
            },
            {
                path: 'products',
                model: "Products"
            }
        ]
	}
}