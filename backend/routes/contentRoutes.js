const express = require('express');
const router = express.Router();
const Controller = require('../controllers/contentController');
const storageGuard = require('../middleware/storageGuard');
const multer = require('multer');

// Memory storage keeps file buffers transient without leaving unmanaged files on disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max payload
});

router.post('/', storageGuard, Controller.addContent);
router.post('/upload', storageGuard, upload.single('file'), Controller.uploadContentFile);
router.get('/', Controller.getAllContent);
router.get('/search', Controller.searchContent);
router.delete('/purge', Controller.purgeContent);
router.get('/:id', Controller.getContentById);
router.put('/:id', Controller.updateContent);
router.delete('/:id', Controller.archiveContent);

module.exports = router;