/* eslint-disable no-underscore-dangle */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const { mapDBToModel } = require('../../utils');

class PlaylistSongsService {
  constructor(cacheService, collaborationService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
    this._collaborationService = collaborationService;
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

    await this._cacheService.delete(`playlist:${id}`);
    return result.rows[0].id;
  }

  async getPlaylistSong(id) {
    try {
      // mendapatkan lagu playlist dari cache
      const result = await this._cacheService.get(`playlist:${id}`);
      return JSON.parse(result);
    } catch (error) {
      // bila gagal, diteruskan dengan mendapatkan data dari database
      const query = {
        text: `SELECT songs.id, songs.title, songs.performer FROM playlistsongs, songs
                WHERE songs.id = playlistsongs.song_id AND playlistsongs.playlist_id = $1`,
        values: [id],
      };

      const result = await this._pool.query(query);
      const mappedResult = result.rows.map(mapDBToModel);

      // daftar lagu pada playlist akan disimpan pada cache sebelum fungsi getPlaylistSongs dikembalikan
      await this._cacheService.set(`playlist:${id}`, JSON.stringify(mappedResult));

      return mappedResult;
    }
  }

  async deletePlaylistSongById(id, songId) {
    const query = {
      text: 'DELETE FROM playlistsongs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [id, songId],
    };

    const result = await this._pool.query(query);
    await this._cacheService.delete(`playlist:${id}`);

    if (!result.rows.length) {
      throw new InvariantError('Lagu gagal dihapus dari playlist');
    }
  }
}

module.exports = PlaylistSongsService;
