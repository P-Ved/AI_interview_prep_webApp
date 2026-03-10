const express = require('express');
const{createSession,getMySession,getSessionsById,deleteSession} = require('../controllers/sessionController');
const {protect} = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/create',protect,createSession);
router.get('/my-sessions',protect,getMySession);
router.get('/:id',protect,getSessionsById);
router.delete('/:id',protect,deleteSession);

module.exports = router;

