/* eslint-disable no-underscore-dangle */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const { getPlaylistSongs } = require('../../utils');

class PlaylistSongsService {
  constructor() {
    this._pool = new Pool();
  }

  async addPlaylistSong({ playlistId, songId }) {
    const id = `playlistsong-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlistsongs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError('Lagu gagal ditambahkan ke playlist');
    }
    return result.rows[0].id;
  }

  async getPlaylistSongs(playlistId, credentialId) {
    const query = {
      text: `SELECT songs.title, songs.performer, playlists.id FROM playlistsongs
      LEFT JOIN songs ON songs.id = playlistsongs.song_id
      LEFT JOIN playlists ON playlists.id = playlistsongs.playlist_id
      LEFT JOIN users ON users.id = playlists.owner
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      WHERE playlists.id = $1 AND playlists.owner = $2 OR collaborations.user_id = $2
      GROUP BY playlists.id, songs.title, songs.performer`,
      values: [playlistId, credentialId],
    };

    const result = await this._pool.query(query);
    return result.rows.map(getPlaylistSongs);
  }

  async deletePlaylistSongById(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlistsongs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError('Lagu gagal dihapus dari playlist');
    }
  }
}

module.exports = PlaylistSongsService;
