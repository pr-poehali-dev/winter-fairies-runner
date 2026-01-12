import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface Obstacle {
  x: number;
  width: number;
  height: number;
  type: 'snowbank' | 'snowball';
}

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const gameRef = useRef({
    player: { x: 100, y: 0, width: 80, height: 100, velocityY: 0, isJumping: false },
    obstacles: [] as Obstacle[],
    groundY: 400,
    gravity: 0.6,
    jumpForce: -13,
    gameSpeed: 6,
    obstacleTimer: 0,
    obstacleInterval: 80,
    score: 0,
    animationFrame: 0,
    runFrame: 0,
    playerImage: null as HTMLImageElement | null,
    playerJumpImage: null as HTMLImageElement | null
  });

  const playSound = (type: 'jump' | 'hit' | 'music') => {
    // Звуковые эффекты через Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'jump') {
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === 'hit') {
      oscillator.frequency.value = 100;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  const handleJump = () => {
    const game = gameRef.current;
    if (!game.player.isJumping) {
      game.player.velocityY = game.jumpForce;
      game.player.isJumping = true;
      playSound('jump');
    }
  };

  const resetGame = () => {
    const game = gameRef.current;
    game.player.y = 0;
    game.player.velocityY = 0;
    game.player.isJumping = false;
    game.obstacles = [];
    game.obstacleTimer = 0;
    game.score = 0;
    game.gameSpeed = 6;
    setScore(0);
  };

  const startGame = () => {
    resetGame();
    setGameState('playing');
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, game: any) => {
    const { x, y, width, height } = game.player;
    const playerY = game.groundY - y - height;
    
    // Анимация бега
    game.runFrame += 0.15;
    const bobOffset = game.player.isJumping ? 0 : Math.sin(game.runFrame) * 5;
    
    // Выбираем правильное изображение в зависимости от состояния
    const currentImage = game.player.isJumping && game.playerJumpImage && game.playerJumpImage.complete
      ? game.playerJumpImage
      : game.playerImage;
    
    if (currentImage && currentImage.complete) {
      // Рисуем изображение феи с небольшим покачиванием
      ctx.save();
      ctx.translate(x + width/2, playerY + height/2 + bobOffset);
      
      // Добавляем легкий наклон при беге
      if (!game.player.isJumping) {
        ctx.rotate(Math.sin(game.runFrame) * 0.05);
      }
      
      ctx.drawImage(currentImage, -width/2, -height/2, width, height);
      ctx.restore();
      
      // Добавляем магический эффект - звёздочки вокруг феи
      if (!game.player.isJumping) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 3; i++) {
          const angle = game.runFrame * 2 + (i * Math.PI * 2 / 3);
          const sparkleX = x + width/2 + Math.cos(angle) * 40;
          const sparkleY = playerY + height/2 + bobOffset + Math.sin(angle) * 30;
          ctx.beginPath();
          ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Fallback если изображение не загрузилось
      ctx.fillStyle = '#E5DEFF';
      ctx.fillRect(x, playerY, width, height);
    }
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obstacle: Obstacle, game: any) => {
    const obstacleY = game.groundY - obstacle.height;
    
    if (obstacle.type === 'snowbank') {
      // Сугроб
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(obstacle.x + obstacle.width/2, obstacleY + obstacle.height * 0.7, 
                  obstacle.width * 0.5, obstacle.height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.ellipse(obstacle.x + obstacle.width * 0.3, obstacleY + obstacle.height * 0.8, 
                  obstacle.width * 0.35, obstacle.height * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.ellipse(obstacle.x + obstacle.width * 0.7, obstacleY + obstacle.height * 0.8, 
                  obstacle.width * 0.35, obstacle.height * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Тень
      ctx.fillStyle = 'rgba(211, 228, 253, 0.5)';
      ctx.beginPath();
      ctx.ellipse(obstacle.x + obstacle.width/2, game.groundY, 
                  obstacle.width * 0.4, obstacle.height * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Снежок
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width/2, obstacleY + obstacle.height/2, obstacle.width/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Блик
      ctx.fillStyle = 'rgba(211, 228, 253, 0.7)';
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width/2 - 5, obstacleY + obstacle.height/2 - 5, obstacle.width/4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const checkCollision = (game: any) => {
    const player = game.player;
    const playerBottom = game.groundY - player.y;
    const playerTop = playerBottom - player.height;
    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    
    for (const obstacle of game.obstacles) {
      const obstacleTop = game.groundY - obstacle.height;
      const obstacleBottom = game.groundY;
      const obstacleLeft = obstacle.x;
      const obstacleRight = obstacle.x + obstacle.width;
      
      if (playerRight > obstacleLeft + 10 && 
          playerLeft < obstacleRight - 10 &&
          playerBottom > obstacleTop + 10 &&
          playerTop < obstacleBottom) {
        return true;
      }
    }
    return false;
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const game = gameRef.current;
    
    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Фон - небо
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#D3E4FD');
    gradient.addColorStop(1, '#E5DEFF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Снежинки на фоне
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 37 + game.animationFrame * 0.5) % canvas.width;
      const y = (i * 53 + game.animationFrame * 0.3) % canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Земля
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, game.groundY, canvas.width, canvas.height - game.groundY);
    
    // Декор земли
    ctx.fillStyle = 'rgba(211, 228, 253, 0.3)';
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.arc(i - (game.animationFrame * 2) % 40, game.groundY + 5, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Физика игрока
    game.player.velocityY += game.gravity;
    game.player.y -= game.player.velocityY;
    
    if (game.player.y <= 0) {
      game.player.y = 0;
      game.player.velocityY = 0;
      game.player.isJumping = false;
    }
    
    // Создание препятствий
    game.obstacleTimer++;
    if (game.obstacleTimer > game.obstacleInterval) {
      const type = Math.random() > 0.5 ? 'snowbank' : 'snowball';
      const height = type === 'snowbank' ? 30 + Math.random() * 30 : 25 + Math.random() * 15;
      game.obstacles.push({
        x: canvas.width,
        width: type === 'snowbank' ? 50 + Math.random() * 30 : 30,
        height,
        type
      });
      game.obstacleTimer = 0;
      game.obstacleInterval = 60 + Math.random() * 60;
    }
    
    // Движение препятствий
    game.obstacles = game.obstacles.filter(obstacle => {
      obstacle.x -= game.gameSpeed;
      return obstacle.x > -obstacle.width;
    });
    
    // Проверка столкновений
    if (checkCollision(game)) {
      playSound('hit');
      setGameState('gameover');
      if (game.score > highScore) {
        setHighScore(game.score);
      }
      return;
    }
    
    // Счёт
    game.score += 0.1;
    game.animationFrame++;
    setScore(Math.floor(game.score));
    
    // Увеличение скорости
    if (game.animationFrame % 300 === 0) {
      game.gameSpeed += 0.5;
    }
    
    // Рисование
    game.obstacles.forEach(obstacle => drawObstacle(ctx, obstacle, game));
    drawPlayer(ctx, game);
    
    // Счёт на экране
    ctx.fillStyle = '#9b87f5';
    ctx.font = 'bold 32px Montserrat, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(game.score)}`, canvas.width - 30, 50);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
          handleJump();
        } else if (gameState === 'gameover') {
          startGame();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    // Загрузка изображения феи (используется и для бега, и для прыжка)
    const img = new Image();
    img.src = 'https://cdn.poehali.dev/files/IMG_0429.jpeg';
    img.onload = () => {
      gameRef.current.playerImage = img;
      gameRef.current.playerJumpImage = img;
    };
  }, []);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const isMobile = window.innerWidth < 768;
      const canvasWidth = isMobile ? Math.min(window.innerWidth - 32, 600) : 800;
      const canvasHeight = isMobile ? Math.min(window.innerHeight * 0.6, 400) : 500;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      gameRef.current.groundY = canvasHeight - 100;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    let animationId: number;
    
    if (gameState === 'playing') {
      const loop = () => {
        gameLoop();
        animationId = requestAnimationFrame(loop);
      };
      loop();
    }
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [gameState]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-50 to-purple-100 p-4">
      <div className="relative w-full max-w-4xl">
        <canvas
          ref={canvasRef}
          className="border-4 border-white rounded-2xl shadow-2xl w-full h-auto touch-none"
          onClick={() => gameState === 'playing' && handleJump()}
          onTouchStart={(e) => {
            e.preventDefault();
            if (gameState === 'playing') handleJump();
          }}
        />
        
        {gameState === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl">
            <div className="text-center space-y-4 md:space-y-6 p-4 md:p-8">
              <h1 className="text-4xl md:text-6xl font-bold text-purple-600 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Зимний Раннер ❄️
              </h1>
              <div className="text-base md:text-lg text-gray-700 space-y-2" style={{ fontFamily: 'Rubik, sans-serif' }}>
                <p className="flex items-center justify-center gap-2">
                  <Icon name="Sparkles" size={20} className="text-purple-500" />
                  Помоги фее Кире перепрыгнуть сугробы!
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Icon name="MousePointer" size={20} className="text-purple-500" />
                  Нажми на экран или SPACE для прыжка
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Icon name="Trophy" size={20} className="text-purple-500" />
                  Набери максимум очков
                </p>
              </div>
              {highScore > 0 && (
                <p className="text-2xl font-semibold text-purple-700">
                  🏆 Рекорд: {highScore}
                </p>
              )}
              <Button 
                onClick={startGame}
                size="lg"
                className="mt-6 text-xl px-8 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Icon name="Play" size={24} className="mr-2" />
                Начать игру
              </Button>
            </div>
          </div>
        )}
        
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
            <div className="text-center space-y-4 md:space-y-6 p-4 md:p-8">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Game Over!
              </h2>
              <p className="text-2xl md:text-3xl text-purple-300">
                Очки: {score}
              </p>
              {score >= highScore && score > 0 && (
                <p className="text-2xl text-yellow-300 animate-pulse">
                  🎉 Новый рекорд!
                </p>
              )}
              {highScore > 0 && score < highScore && (
                <p className="text-xl text-purple-200">
                  Рекорд: {highScore}
                </p>
              )}
              <Button 
                onClick={startGame}
                size="lg"
                className="mt-6 text-xl px-8 py-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Icon name="RotateCcw" size={24} className="mr-2" />
                Играть снова
              </Button>
              <p className="text-sm text-gray-300 mt-4">
                Нажми SPACE для рестарта
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;