-- Profile photos must be publicly readable so the Image component can load them
-- via the URL returned by getPublicUrl. The path (userId/avatar.jpg) is already
-- opaque enough that guessing another user's URL is not a practical concern.
update storage.buckets
set public = true
where name = 'profile-photos';
