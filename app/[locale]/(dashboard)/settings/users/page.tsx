'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import { Plus, Shield, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/hooks/use-auth';
import { usersCollection } from '@/lib/firebase/firestore';
import type { User } from '@/lib/types/models';
import { TableSkeleton } from '@/components/shared/page-skeleton';

export default function UsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<(User & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(usersCollection, orderBy('nameAr'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton rows={5} cols={7} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button asChild>
          <Link href="/settings/users/new">
            <Plus className="me-2 h-4 w-4" />
            {t('addUser')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('noUsers')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('nameAr')}</TableHead>
                  <TableHead>{t('nameEn')}</TableHead>
                  <TableHead>{t('username')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nameAr}</TableCell>
                    <TableCell>{user.nameEn}</TableCell>
                    <TableCell dir="ltr">{user.username}</TableCell>
                    <TableCell dir="ltr">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="me-1 h-3 w-3" />
                        {user.role === 'admin' ? t('admin') : t('user')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <UserCheck className="me-1 h-3 w-3" />
                          {t('active')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <UserX className="me-1 h-3 w-3" />
                          {t('inactive')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/settings/users/${user.id}`}>
                          {tc('details')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
