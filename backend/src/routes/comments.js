const { Router } = require('express');
const { Post, Comment } = require('../database');
const { authorize } = require('../authMiddleware');

const router = Router();

// Moderação: o professor dono da publicação remove comentários dela.
// O próprio autor do comentário também pode apagá-lo.
router.delete('/:id', authorize(), async (req, res) => {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comentário não encontrado' });

    const post = await Post.findByPk(comment.postId);
    const isCommentAuthor = comment.userId !== null && comment.userId === req.user.id;
    const isPostOwner =
        req.user.role === 'professor' && post && (post.authorId === null || post.authorId === req.user.id);

    if (!isCommentAuthor && !isPostOwner) {
        return res.status(403).json({
            message: 'Só o professor que publicou a aula ou o autor do comentário podem removê-lo.'
        });
    }

    await comment.destroy();
    res.json({ message: 'Comentário removido com sucesso.' });
});

module.exports = router;
