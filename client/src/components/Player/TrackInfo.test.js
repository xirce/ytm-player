import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrackInfo } from './TrackInfo';

jest.mock('../ArtistLink/ArtistLink', () => ({ ArtistLink: ({ info }) => <span>{info.name}</span> }));

const track = {
    id: 'track',
    radioId: 'radio',
    title: 'Song',
    artist: { id: 'artist', name: 'Artist' },
    imageUrl: '/artwork.jpg',
    duration: 180
};

test('mini artwork remains visible while the expanded shared-artwork placeholder stays hidden', () => {
    const mini = renderToStaticMarkup(<TrackInfo source={track} sharedArtwork />);
    const full = renderToStaticMarkup(<TrackInfo source={track} expanded sharedArtwork />);

    expect(mini).toContain('data-player-artwork="mini"');
    expect(mini).toContain('src="/artwork.jpg"');
    expect(mini).not.toContain('visibility:hidden');
    expect(full).toContain('data-player-artwork="full"');
    expect(full).toContain('visibility:hidden');
});
