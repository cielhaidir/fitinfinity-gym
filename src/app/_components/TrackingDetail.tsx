"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Activity,
  Weight,
  Zap,
  Heart,
  Target,
  Utensils,
  Dumbbell,
  Moon,
  TrendingUp,
  TrendingDown,
  Calendar,
  User
} from "lucide-react";
import { api } from "@/trpc/react";
import { formatDate } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface TrackingDetailProps {
  trackingId: string;
  onBack?: () => void;
}

export function TrackingDetail({ trackingId, onBack }: TrackingDetailProps) {
  const { 
    data: tracking, 
    isLoading, 
    error 
  } = api.tracking.getById.useQuery({ id: trackingId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !tracking) {
    return (
      <div className="space-y-4">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        )}
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || "Data tracking tidak ditemukan"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const composition = tracking.composition as any;
  const segment = tracking.segment as any;
  const obesity = tracking.obesity as any;
  const suggestion = tracking.suggestion as any;

  const MetricCard = ({ 
    title, 
    value, 
    unit, 
    icon, 
    description,
    trend 
  }: {
    title: string;
    value: any;
    unit?: string;
    icon: React.ReactNode;
    description?: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => {
    if (value === undefined || value === null) return null;

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-blue-600">{icon}</div>
              <div>
                <p className="text-sm font-medium ">{title}</p>
                <p className="text-2xl font-bold">
                  {typeof value === 'number' ? value.toFixed(1) : value}
                  {unit && <span className="text-lg  ml-1">{unit}</span>}
                </p>
                {description && (
                  <p className="text-xs  mt-1">{description}</p>
                )}
              </div>
            </div>
            {trend && (
              <div className={`text-${trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'}-500`}>
                {trend === 'up' && <TrendingUp className="h-5 w-5" />}
                {trend === 'down' && <TrendingDown className="h-5 w-5" />}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Detail Analisis Komposisi Tubuh</h1>
            <div className="flex items-center gap-4 text-sm  mt-1">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(new Date(tracking.createdAt), 'dd MMMM yyyy, HH:mm', { locale: localeId })}
              </div>
              {tracking.user && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {tracking.user.name || tracking.user.email}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="composition" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="composition">Komposisi</TabsTrigger>
          <TabsTrigger value="segments">Segmen Tubuh</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrisi</TabsTrigger>
          <TabsTrigger value="fitness">Fitness</TabsTrigger>
          <TabsTrigger value="lifestyle">Gaya Hidup</TabsTrigger>
        </TabsList>

        {/* Body Composition Tab */}
        <TabsContent value="composition">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Komposisi Tubuh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MetricCard
                    title="BMI"
                    value={composition?.bmi}
                    icon={<Weight className="h-5 w-5" />}
                    description="Body Mass Index"
                  />
                  <MetricCard
                    title="BMR"
                    value={composition?.bmr}
                    unit="kcal"
                    icon={<Zap className="h-5 w-5" />}
                    description="Metabolisme Basal"
                  />
                  <MetricCard
                    title="Lemak Tubuh"
                    value={composition?.bodyFat}
                    unit="%"
                    icon={<TrendingDown className="h-5 w-5" />}
                    description="Persentase lemak tubuh"
                  />
                  <MetricCard
                    title="Massa Otot"
                    value={composition?.muscleMass}
                    unit="kg"
                    icon={<TrendingUp className="h-5 w-5" />}
                    description="Total massa otot"
                  />
                  <MetricCard
                    title="Massa Tulang"
                    value={composition?.boneMass}
                    unit="kg"
                    icon={<Activity className="h-5 w-5" />}
                    description="Massa tulang"
                  />
                  <MetricCard
                    title="Persentase Air"
                    value={composition?.waterPercentage}
                    unit="%"
                    icon={<Heart className="h-5 w-5" />}
                    description="Kandungan air tubuh"
                  />
                  <MetricCard
                    title="Protein"
                    value={composition?.proteinPercentage}
                    unit="%"
                    icon={<Utensils className="h-5 w-5" />}
                    description="Persentase protein"
                  />
                  <MetricCard
                    title="Usia Metabolik"
                    value={composition?.metabolicAge}
                    unit="tahun"
                    icon={<Calendar className="h-5 w-5" />}
                    description="Usia metabolisme"
                  />
                  <MetricCard
                    title="Rating Fisik"
                    value={composition?.physiqueRating}
                    icon={<Target className="h-5 w-5" />}
                    description="Penilaian fisik keseluruhan"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Health Status */}
            {obesity && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Status Kesehatan & Obesitas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4 flex-wrap">
                      {obesity.obesityLevel && (
                        <Badge 
                          variant={
                            obesity.obesityLevel === 'normal' ? 'default' :
                            obesity.obesityLevel === 'overweight' ? 'secondary' :
                            obesity.obesityLevel === 'obese' ? 'destructive' : 'outline'
                          }
                          className="text-sm py-1 px-3"
                        >
                          Status: {obesity.obesityLevel === 'normal' ? 'Normal' :
                                  obesity.obesityLevel === 'overweight' ? 'Kelebihan Berat' :
                                  obesity.obesityLevel === 'obese' ? 'Obesitas' :
                                  obesity.obesityLevel === 'underweight' ? 'Kekurangan Berat' : obesity.obesityLevel}
                        </Badge>
                      )}
                      {obesity.healthRisk && (
                        <Badge 
                          variant={
                            obesity.healthRisk === 'low' ? 'default' :
                            obesity.healthRisk === 'moderate' ? 'secondary' :
                            'destructive'
                          }
                          className="text-sm py-1 px-3"
                        >
                          Risiko: {obesity.healthRisk === 'low' ? 'Rendah' :
                                   obesity.healthRisk === 'moderate' ? 'Sedang' :
                                   obesity.healthRisk === 'high' ? 'Tinggi' : 'Sangat Tinggi'}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard
                        title="Lemak Visceral"
                        value={obesity.visceralFat}
                        icon={<Heart className="h-5 w-5" />}
                        description="Lemak di sekitar organ"
                      />
                      <MetricCard
                        title="Lemak Subkutan"
                        value={obesity.subcutaneousFat}
                        unit="%"
                        icon={<TrendingDown className="h-5 w-5" />}
                        description="Lemak di bawah kulit"
                      />
                      <MetricCard
                        title="Total Lemak Tubuh"
                        value={obesity.totalBodyFat}
                        unit="%"
                        icon={<Activity className="h-5 w-5" />}
                        description="Total persentase lemak"
                      />
                      <MetricCard
                        title="Indeks Massa Lemak"
                        value={obesity.fatMassIndex}
                        icon={<Weight className="h-5 w-5" />}
                        description="FMI"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Body Segments Tab */}
        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Analisis Segmen Tubuh
              </CardTitle>
            </CardHeader>
            <CardContent>
              {segment && Object.keys(segment).length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard
                      title="Lengan Kanan"
                      value={segment.rightArm}
                      unit="kg"
                      icon={<TrendingUp className="h-5 w-5" />}
                      description="Massa otot lengan kanan"
                    />
                    <MetricCard
                      title="Lengan Kiri"
                      value={segment.leftArm}
                      unit="kg"
                      icon={<TrendingUp className="h-5 w-5" />}
                      description="Massa otot lengan kiri"
                    />
                    <MetricCard
                      title="Batang Tubuh"
                      value={segment.trunk}
                      unit="kg"
                      icon={<Activity className="h-5 w-5" />}
                      description="Massa otot batang tubuh"
                    />
                    <MetricCard
                      title="Kaki Kanan"
                      value={segment.rightLeg}
                      unit="kg"
                      icon={<TrendingUp className="h-5 w-5" />}
                      description="Massa otot kaki kanan"
                    />
                    <MetricCard
                      title="Kaki Kiri"
                      value={segment.leftLeg}
                      unit="kg"
                      icon={<TrendingUp className="h-5 w-5" />}
                      description="Massa otot kaki kiri"
                    />
                  </div>
                  
                  {segment.muscleBalance && (
                    <div className="mt-6">
                      <h4 className="font-medium text-lg mb-4">Keseimbangan Otot</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MetricCard
                          title="Keseimbangan Kiri-Kanan"
                          value={segment.muscleBalance.leftRight}
                          unit="%"
                          icon={<Target className="h-5 w-5" />}
                          description="Rasio keseimbangan otot kiri-kanan"
                        />
                        <MetricCard
                          title="Keseimbangan Atas-Bawah"
                          value={segment.muscleBalance.upperLower}
                          unit="%"
                          icon={<Target className="h-5 w-5" />}
                          description="Rasio keseimbangan otot atas-bawah"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center  py-8">
                  Data segmen tubuh tidak tersedia
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nutrition Tab */}
        <TabsContent value="nutrition">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Rencana Nutrisi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestion?.nutritionPlan ? (
                <div className="space-y-6">
                  {/* Macronutrients */}
                  {suggestion.nutritionPlan.macronutrients && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Makronutrien</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {suggestion.nutritionPlan.macronutrients.protein && (
                          <Card>
                            <CardContent className="p-4">
                              <h5 className="font-medium text-blue-600 mb-2">Protein</h5>
                              <p className="text-2xl font-bold">
                                {suggestion.nutritionPlan.macronutrients.protein.grams}g 
                                <span className="text-sm  ml-2">
                                  ({suggestion.nutritionPlan.macronutrients.protein.percentage}%)
                                </span>
                              </p>
                              {suggestion.nutritionPlan.macronutrients.protein.sources && (
                                <div className="mt-2">
                                  <p className="text-xs  mb-1">Sumber:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {suggestion.nutritionPlan.macronutrients.protein.sources.slice(0, 3).map((source: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                        
                        {suggestion.nutritionPlan.macronutrients.carbohydrates && (
                          <Card>
                            <CardContent className="p-4">
                              <h5 className="font-medium text-green-600 mb-2">Karbohidrat</h5>
                              <p className="text-2xl font-bold">
                                {suggestion.nutritionPlan.macronutrients.carbohydrates.grams}g 
                                <span className="text-sm  ml-2">
                                  ({suggestion.nutritionPlan.macronutrients.carbohydrates.percentage}%)
                                </span>
                              </p>
                              {suggestion.nutritionPlan.macronutrients.carbohydrates.sources && (
                                <div className="mt-2">
                                  <p className="text-xs  mb-1">Sumber:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {suggestion.nutritionPlan.macronutrients.carbohydrates.sources.slice(0, 3).map((source: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                        
                        {suggestion.nutritionPlan.macronutrients.fats && (
                          <Card>
                            <CardContent className="p-4">
                              <h5 className="font-medium text-orange-600 mb-2">Lemak</h5>
                              <p className="text-2xl font-bold">
                                {suggestion.nutritionPlan.macronutrients.fats.grams}g 
                                <span className="text-sm  ml-2">
                                  ({suggestion.nutritionPlan.macronutrients.fats.percentage}%)
                                </span>
                              </p>
                              {suggestion.nutritionPlan.macronutrients.fats.sources && (
                                <div className="mt-2">
                                  <p className="text-xs  mb-1">Sumber:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {suggestion.nutritionPlan.macronutrients.fats.sources.slice(0, 3).map((source: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Micronutrients */}
                  {suggestion.nutritionPlan.micronutrients && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Mikronutrien</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestion.nutritionPlan.micronutrients.map((micro: any, i: number) => (
                          <Card key={i}>
                            <CardContent className="p-4">
                              <h5 className="font-medium text-purple-600 mb-1">{micro.name}</h5>
                              <p className="text-lg font-semibold">{micro.dailyAmount}</p>
                              <p className="text-sm  mt-1">{micro.importance}</p>
                              {micro.sources && (
                                <div className="mt-2">
                                  <p className="text-xs  mb-1">Sumber:</p>
                                  <p className="text-sm">{micro.sources.join(", ")}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meal Timing */}
                  {suggestion.nutritionPlan.mealTiming && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Waktu Makan</h4>
                      <Card>
                        <CardContent className="p-4">
                          <ul className="space-y-2">
                            {suggestion.nutritionPlan.mealTiming.map((timing: string, i: number) => (
                              <li key={i} className="text-sm ">• {timing}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Hydration */}
                  {suggestion.nutritionPlan.hydration && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Hidrasi</h4>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm ">{suggestion.nutritionPlan.hydration}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center  py-8">
                  Rencana nutrisi tidak tersedia
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fitness Tab */}
        <TabsContent value="fitness">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Rencana Fitness
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestion?.gymWorkoutPlan ? (
                <div className="space-y-6">
                  {/* Workout Intensity */}
                  {suggestion.gymWorkoutPlan.intensity && (
                    <div>
                      <h4 className="font-medium text-lg mb-2">Tingkat Intensitas</h4>
                      <Badge variant="outline" className="text-sm py-1 px-3">
                        {suggestion.gymWorkoutPlan.intensity === 'beginner' ? 'Pemula' :
                         suggestion.gymWorkoutPlan.intensity === 'intermediate' ? 'Menengah' :
                         suggestion.gymWorkoutPlan.intensity === 'advanced' ? 'Lanjutan' : suggestion.gymWorkoutPlan.intensity}
                      </Badge>
                    </div>
                  )}

                  {/* Cardio */}
                  {suggestion.gymWorkoutPlan.cardio && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Latihan Kardio</h4>
                      <Card>
                        <CardContent className="p-4">
                          <ul className="space-y-2">
                            {suggestion.gymWorkoutPlan.cardio.map((exercise: string, i: number) => (
                              <li key={i} className="text-sm ">• {exercise}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Strength Training */}
                  {suggestion.gymWorkoutPlan.strengthTraining && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Latihan Kekuatan</h4>
                      <Card>
                        <CardContent className="p-4">
                          <ul className="space-y-2">
                            {suggestion.gymWorkoutPlan.strengthTraining.map((exercise: string, i: number) => (
                              <li key={i} className="text-sm ">• {exercise}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Weekly Schedule */}
                  {suggestion.gymWorkoutPlan.weeklySchedule && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Jadwal Mingguan</h4>
                      <Card>
                        <CardContent className="p-4">
                          <ul className="space-y-2">
                            {suggestion.gymWorkoutPlan.weeklySchedule.map((schedule: string, i: number) => (
                              <li key={i} className="text-sm ">• {schedule}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center  py-8">
                  Rencana fitness tidak tersedia
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lifestyle Tab */}
        <TabsContent value="lifestyle">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Gaya Hidup
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestion?.lifestyleHabits ? (
                <div className="space-y-6">
                  {/* Sleep */}
                  {suggestion.lifestyleHabits.sleep && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Tidur</h4>
                      <Card>
                        <CardContent className="p-4">
                          <ul className="space-y-2">
                            {suggestion.lifestyleHabits.sleep.map((tip: string, i: number) => (
                              <li key={i} className="text-sm ">• {tip}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Stress Management */}
                  {suggestion.lifestyleHabits.stressManagement && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Manajemen Stres</h4>
                      <Card>
                        <CardContent className="p-4">
                          <ul className="space-y-2">
                            {suggestion.lifestyleHabits.stressManagement.map((tip: string, i: number) => (
                              <li key={i} className="text-sm ">• {tip}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Daily Habits */}
                  {suggestion.lifestyleHabits.dailyHabits && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Kebiasaan Harian</h4>
                      <Card>
                        <CardContent className="p-4">
                          <ul className="space-y-2">
                            {suggestion.lifestyleHabits.dailyHabits.map((habit: string, i: number) => (
                              <li key={i} className="text-sm ">• {habit}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Supplementation */}
                  {suggestion.lifestyleHabits.supplementation && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Suplemen</h4>
                      <Card>
                        <CardContent className="p-4">
                          <ul className="space-y-2">
                            {suggestion.lifestyleHabits.supplementation.map((supplement: string, i: number) => (
                              <li key={i} className="text-sm ">• {supplement}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Goals and Timeline */}
                  {(suggestion.estimatedTimeToGoal || suggestion.weeklyCalorieDeficit || suggestion.priorityAreas) && (
                    <div>
                      <h4 className="font-medium text-lg mb-4">Target & Timeline</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {suggestion.estimatedTimeToGoal && (
                          <Card>
                            <CardContent className="p-4">
                              <h5 className="font-medium text-blue-600 mb-2">Estimasi Waktu</h5>
                              <p className="text-sm ">{suggestion.estimatedTimeToGoal}</p>
                            </CardContent>
                          </Card>
                        )}
                        {suggestion.weeklyCalorieDeficit && (
                          <Card>
                            <CardContent className="p-4">
                              <h5 className="font-medium text-green-600 mb-2">Defisit Kalori</h5>
                              <p className="text-lg font-semibold">{suggestion.weeklyCalorieDeficit} kcal/minggu</p>
                            </CardContent>
                          </Card>
                        )}
                        {suggestion.priorityAreas && (
                          <Card>
                            <CardContent className="p-4">
                              <h5 className="font-medium text-orange-600 mb-2">Area Prioritas</h5>
                              <div className="flex flex-wrap gap-1">
                                {suggestion.priorityAreas.map((area: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {area}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center  py-8">
                  Rekomendasi gaya hidup tidak tersedia
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}