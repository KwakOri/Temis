'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { Template } from '@/types/supabase-types';

export default function ShopPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicTemplates();
  }, []);

  const fetchPublicTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">템플릿 상점</h1>
        <p className="text-gray-600">다양한 시간표 템플릿을 둘러보고 구매하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Link 
            key={template.id} 
            href={`/shop/${template.id}`}
            className="group block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
              {template.thumbnail_url ? (
                <Image
                  src={template.thumbnail_url}
                  alt={template.name}
                  width={400}
                  height={225}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  미리보기 이미지 없음
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                {template.name}
              </h3>
              <p className="text-gray-600 text-sm line-clamp-2">
                {template.description}
              </p>
              <div className="mt-3 text-blue-600 text-sm font-medium">
                자세히 보기 →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">현재 판매 중인 템플릿이 없습니다.</p>
        </div>
      )}
    </div>
  );
}