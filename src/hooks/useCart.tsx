import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart');

     if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find(p => p.id === productId);
      if(!productExists) {
        const {data: product} = await api.get<Product>(`products/${productId}`);
        const {data: stock} = await api.get<Stock>(`stock/${productId}`);

        if(stock.amount > 0 ) {
          setCart([...cart, {...product, amount: 1}])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...product, amount: 1}]));
          toast.success('Produto adicionado ao carrinho');
          return
        }
        
      }

      if(productExists) {
        const {data: stock} = await api.get<Stock>(`stock/${productId}`);
        if(stock.amount > productExists.amount) {
          const updatedProducts = cart.map(p => p.id === productId ? {...p, amount: p.amount + 1} : p)
          setCart(updatedProducts);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProducts));
          
          return

        }else{
          toast.error('Produto sem estoque');
        }
      }




    } catch {
      toast.error('Erro ao adicionar o produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(p => p.id === productId); 
      if (!productExists) {
        toast.error('Product not found');
        return
      }
      const updatedProducts = cart.filter(p => p.id !== productId);
      setCart(updatedProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProducts))
    } catch {
      toast.error('Erro ao remover o produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        toast.error('Erro na alteração da quantidade')
        return
      }
      const response = await api.get(`/stock/${productId}`)
      const productAmount = response.data.amount;
      const stockIsFree = amount > productAmount;
      
      if(stockIsFree) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const productExists = cart.find(p => p.id === productId);
      if (!productExists) {
        toast.error('Erro na alteração do produto');
        return
      }

      const updatedProducts = cart.map(p => p.id === productId ? {...p, amount: amount} : p)
      setCart(updatedProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProducts))

    } catch {
      toast.error('Erro na alteração da quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
