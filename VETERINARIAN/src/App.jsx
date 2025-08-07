
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Badge } from "./components/ui/badge"
import {
  Heart,
  MessageSquare,
  FileText,
  Bell,
  Shield,
  Clock,
  Users,
  CheckCircle,
  ArrowRight,
  Stethoscope,
} from "lucide-react"
import { useState } from "react"
import LogIn from "./logIn"
import { Link } from "react-router-dom"

function App() {
  const [currentPage, setCurrentPage] = useState("home") 

  if (currentPage === "login") {
    return <LogIn onBack={() => setCurrentPage("home")} />
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white/80 backdrop-blur-sm sticky top-0 z-50 animate-in slide-in-from-top duration-500">
        <a href="/" className="flex items-center justify-center group">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-green-800 group-hover:text-green-600 transition-colors">Echo</span>
          </div>
        </a>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a
            href="#features"
            className="text-sm font-medium hover:text-green-600 transition-all duration-200 hover:scale-105"
          >
            Features
          </a>
          <a
            href="#benefits"
            className="text-sm font-medium hover:text-green-600 transition-all duration-200 hover:scale-105"
          >
            Benefits
          </a>
          <a
            href="#contact"
            className="text-sm font-medium hover:text-green-600 transition-all duration-200 hover:scale-105"
          >
            Contact
          </a>
        </nav>
        <div className="ml-6 flex gap-2">
          <Link to="/login">
            <Button size="sm" className="cursor-pointer hover:scale-105 transition-transform duration-200">
              Sign In
            </Button>
          </Link>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white cursor-pointer hover:scale-105 transition-all duration-200 hover:shadow-lg"
          >
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4 animate-in slide-in-from-left duration-700">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl text-gray-900 animate-in slide-in-from-left duration-700 delay-300">
                    Streamline Your Veterinary Practice with <span className="text-green-600 animate-pulse">Echo</span>
                  </h1>
                  <p className="max-w-[600px] text-gray-600 md:text-xl animate-in slide-in-from-left duration-700 delay-500">
                    The complete platform for veterinarians to manage horse medical records, appointments, and client
                    communications all in one place.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row animate-in slide-in-from-left duration-700 delay-700">
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 hover:scale-105 transition-all duration-200 hover:shadow-lg group"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="hover:scale-105 transition-all duration-200 hover:shadow-md bg-transparent"
                  >
                    Learn More
                  </Button>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600 animate-in fade-in duration-700 delay-1000">
                  <div className="flex items-center hover:scale-105 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                    Easy setup
                  </div>
                  <div className="flex items-center hover:scale-105 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                    Secure & reliable
                  </div>
                  <div className="flex items-center hover:scale-105 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                    24/7 support
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center animate-in slide-in-from-right duration-700 delay-300">
                <img
                  src="https://t4.ftcdn.net/jpg/02/46/23/73/360_F_246237304_IW2l3Z6VFoaHRSa0PAdModNl6FiCDRBL.jpg"
                  width="600"
                  height="400"
                  alt="Veterinarian using Echo app"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover shadow-2xl hover:scale-105 transition-transform duration-500 hover:shadow-3xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Overview */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in duration-700">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">
                  Everything You Need to Manage Your Practice
                </h2>
                <p className="max-w-[900px] text-gray-600 md:text-xl">
                  Echo provides comprehensive tools for modern veterinary practices specializing in equine care.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="border-2 hover:border-green-200 transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in slide-in-from-bottom duration-700 delay-200">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 hover:bg-green-200 transition-colors duration-200 hover:scale-110">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Manage</CardTitle>
                  <CardDescription>Complete control over your practice data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Account profiles</span>
                  </div>
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Horse medical records</span>
                  </div>
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Message history</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-green-200 transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in slide-in-from-bottom duration-700 delay-400">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 hover:bg-blue-200 transition-colors duration-200 hover:scale-110">
                    <Heart className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Process</CardTitle>
                  <CardDescription>Streamlined workflows for daily operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">User authentication</span>
                  </div>
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Health record updates</span>
                  </div>
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Appointment requests</span>
                  </div>
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Messaging system</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-green-200 transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in slide-in-from-bottom duration-700 delay-600">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 hover:bg-purple-200 transition-colors duration-200 hover:scale-110">
                    <Bell className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Monitor</CardTitle>
                  <CardDescription>Stay on top of your practice activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Appointment schedules</span>
                  </div>
                  <div className="flex items-center space-x-2 hover:translate-x-1 transition-transform duration-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Real-time notifications</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Detailed Features */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4 animate-in slide-in-from-left duration-700">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-gray-900">
                  Comprehensive Horse Medical Records
                </h2>
                <p className="text-gray-600 md:text-lg">
                  Keep detailed, organized records for every horse in your care. Track medical history, treatments,
                  vaccinations, and more with our intuitive interface.
                </p>
                <div className="grid gap-4">
                  <div className="flex items-start space-x-3 hover:translate-x-2 transition-transform duration-200 animate-in slide-in-from-left duration-700 delay-200">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5 hover:bg-green-200 transition-colors duration-200">
                      <FileText className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Digital Health Records</h3>
                      <p className="text-sm text-gray-600">Complete medical history at your fingertips</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 hover:translate-x-2 transition-transform duration-200 animate-in slide-in-from-left duration-700 delay-400">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5 hover:bg-green-200 transition-colors duration-200">
                      <Bell className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Treatment Tracking</h3>
                      <p className="text-sm text-gray-600">Monitor ongoing treatments and medications</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 hover:translate-x-2 transition-transform duration-200 animate-in slide-in-from-left duration-700 delay-600">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5 hover:bg-green-200 transition-colors duration-200">
                      <Shield className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Secure & Compliant</h3>
                      <p className="text-sm text-gray-600">HIPAA-compliant data storage and access</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center animate-in slide-in-from-right duration-700 delay-300">
                <img
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400"
                  width="500"
                  height="400"
                  alt="Medical records interface"
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover shadow-lg hover:scale-105 transition-transform duration-500 hover:shadow-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12 animate-in fade-in duration-700">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">
                Why Veterinarians Will Choose Echo
              </h2>
              <p className="max-w-[900px] text-gray-600 md:text-xl">
                Discover how Echo will transform your veterinary practice with powerful, intuitive tools.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center space-y-2 hover:scale-105 transition-transform duration-300 animate-in slide-in-from-bottom duration-700 delay-200">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors duration-200 hover:rotate-12">
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Save Time</h3>
                <p className="text-gray-600">Reduce administrative work by up to 40% with automated workflows</p>
              </div>
              <div className="text-center space-y-2 hover:scale-105 transition-transform duration-300 animate-in slide-in-from-bottom duration-700 delay-400">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors duration-200 hover:rotate-12">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Better Care</h3>
                <p className="text-gray-600">Improve patient outcomes with comprehensive health tracking</p>
              </div>
              <div className="text-center space-y-2 hover:scale-105 transition-transform duration-300 animate-in slide-in-from-bottom duration-700 delay-600">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center hover:bg-purple-200 transition-colors duration-200 hover:rotate-12">
                  <MessageSquare className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Stay Connected</h3>
                <p className="text-gray-600">Seamless communication with horse owners and staff</p>
              </div>
              <div className="text-center space-y-2 hover:scale-105 transition-transform duration-300 animate-in slide-in-from-bottom duration-700 delay-800">
                <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center hover:bg-orange-200 transition-colors duration-200 hover:rotate-12">
                  <Shield className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Secure Data</h3>
                <p className="text-gray-600">Enterprise-grade security keeps your data safe and compliant</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-green-600 animate-in fade-in duration-700">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2 animate-in slide-in-from-bottom duration-700">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white">
                  Ready to Transform Your Practice?
                </h2>
                <p className="mx-auto max-w-[600px] text-green-100 md:text-xl">
                  Be among the first veterinarians to experience the future of practice management.
                </p>
              </div>
              <div className="space-x-4 animate-in slide-in-from-bottom duration-700 delay-300">
                <Button
                  size="lg"
                  className="bg-white text-green-600 hover:bg-gray-100 hover:scale-105 transition-all duration-200 hover:shadow-lg"
                >
                  Get Started Today
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-green-600 bg-transparent hover:scale-105 transition-all duration-200"
                >
                  Learn More
                </Button>
              </div>
              <p className="text-sm text-green-100 animate-in fade-in duration-700 delay-500">
                Professional veterinary management • Secure & compliant • Expert support
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-gray-50 animate-in slide-in-from-bottom duration-500">
        <div className="flex items-center space-x-2 group">
          <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-green-800 group-hover:text-green-600 transition-colors">Echo</span>
        </div>
        <p className="text-xs text-gray-600 sm:ml-4">© 2025 Echo - Veterinary Portal. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <a
            href="#"
            className="text-xs hover:underline underline-offset-4 text-gray-600 hover:text-green-600 transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="text-xs hover:underline underline-offset-4 text-gray-600 hover:text-green-600 transition-colors"
          >
            Terms of Service
          </a>
          <a
            href="#"
            className="text-xs hover:underline underline-offset-4 text-gray-600 hover:text-green-600 transition-colors"
            id="contact"
          >
            Contact Support
          </a>
        </nav>
      </footer>
    </div>
  )
}

export default App
